#!/usr/bin/env python3
"""Synthetic stress test for a Bengaluru high-occupancy transitway concept.

This is an exploratory queueing model, not a forecast.  It deliberately keeps
the traffic mechanics, assumptions, random seeds, and neural controller visible
so that a reader can challenge them.
"""

from __future__ import annotations

from collections import deque
from dataclasses import asdict, dataclass
import json
import math
from pathlib import Path
from typing import Iterable

import matplotlib.pyplot as plt
from matplotlib import patheffects
from matplotlib.patches import Circle, FancyBboxPatch, Polygon, Rectangle
import numpy as np


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "output"
ASSETS = ROOT / "assets"
OUTPUT.mkdir(exist_ok=True)
ASSETS.mkdir(exist_ok=True)

SEED = 20261020
MINUTES = 240


@dataclass(frozen=True)
class Mode:
    occupancy: float
    pce: float
    base_rate_per_minute: float
    eligible: bool
    transit_priority: bool
    low_income_probability: float
    facility_charge_per_vehicle: float


MODES = {
    # These are scenario assumptions, not observed Bengaluru averages.
    "car_1_2": Mode(1.25, 1.00, 14.0, False, False, 0.16, 0.0),
    "car_4_plus": Mode(4.00, 1.00, 2.7, True, False, 0.22, 72.0),
    "shared_van": Mode(7.00, 1.10, 2.0, True, True, 0.56, 14.0),
    "minibus": Mode(14.0, 1.45, 0.95, True, True, 0.66, 0.0),
    "scheduled_bus": Mode(38.0, 2.30, 0.50, True, True, 0.72, 0.0),
    "local_freight": Mode(1.20, 1.55, 2.2, False, False, 0.30, 0.0),
}


@dataclass
class Vehicle:
    arrival: int
    mode: str
    occupancy: float
    pce: float
    low_income: bool
    facility_charge: float


@dataclass(frozen=True)
class Corridor:
    name: str
    demand_multiplier: float
    surface_capacity_pce_per_minute: float
    surface_free_flow_minutes: float
    managed_free_flow_minutes: float


CORRIDORS = (
    Corridor("Peenya–Hebbal", 1.10, 26.0, 36.0, 19.0),
    Corridor("Hebbal–KR Puram", 1.22, 27.0, 41.0, 22.0),
    Corridor("KR Puram–Silk Board", 1.30, 28.0, 46.0, 24.0),
    Corridor("Hosur Road–Central", 1.05, 27.0, 39.0, 21.0),
    Corridor("Mysuru Road–Central", 0.94, 25.0, 37.0, 20.0),
    Corridor("Magadi Road–Central", 0.82, 24.0, 34.0, 19.0),
)


ACTIONS = tuple(
    (gate, price)
    for gate in (0.15, 0.45, 0.80)
    for price in (0.80, 1.00, 1.25)
)


class NeuralGate:
    """A tiny NumPy MLP trained to imitate a transparent congestion rule."""

    def __init__(self, seed: int = SEED):
        self.rng = np.random.default_rng(seed)
        self.mean = np.zeros(5)
        self.std = np.ones(5)
        self.w1 = self.rng.normal(0, 0.30, (5, 18))
        self.b1 = np.zeros(18)
        self.w2 = self.rng.normal(0, 0.25, (18, len(ACTIONS)))
        self.b2 = np.zeros(len(ACTIONS))
        self.validation_accuracy = 0.0

    @staticmethod
    def teacher(state: np.ndarray) -> int:
        managed_q, surface_q, demand, incident, transit_share = state
        best_index = 0
        best_cost = float("inf")
        for index, (gate, price) in enumerate(ACTIONS):
            price_response = math.exp(-0.72 * (price - 1.0))
            capacity = 0.23 if incident > 0.5 else 1.0
            transit_load = demand * (0.34 + 1.25 * transit_share)
            private_load = demand * 0.70 * gate * price_response
            load_ratio = (transit_load + private_load) / max(capacity, 0.05)
            overload = max(0.0, load_ratio - 0.82)
            # Public transport reliability dominates the objective. Surface
            # relief matters, while price and empty capacity carry smaller costs.
            cost = (
                20.0 * overload**2
                + 7.0 * managed_q * (0.35 + gate)
                + 2.8 * surface_q * (1.0 - gate)
                + 1.5 * max(0.0, 0.56 - load_ratio) ** 2
                + 0.55 * max(0.0, price - 1.0)
                + 1.3 * incident * gate
            )
            if cost < best_cost:
                best_cost = cost
                best_index = index
        return best_index

    def _forward(self, x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        hidden = np.tanh(x @ self.w1 + self.b1)
        logits = hidden @ self.w2 + self.b2
        logits -= logits.max(axis=1, keepdims=True)
        probabilities = np.exp(logits)
        probabilities /= probabilities.sum(axis=1, keepdims=True)
        return hidden, probabilities

    def train(self, samples: int = 9000, epochs: int = 1500) -> None:
        rng = self.rng
        x = np.column_stack(
            [
                rng.uniform(0.0, 3.5, samples),   # managed queue / minute capacity
                rng.uniform(0.0, 7.0, samples),   # surface queue / minute capacity
                rng.uniform(0.55, 1.75, samples),
                rng.binomial(1, 0.14, samples),
                rng.uniform(0.12, 0.46, samples),
            ]
        )
        y = np.array([self.teacher(row) for row in x], dtype=int)
        order = rng.permutation(samples)
        split = int(samples * 0.82)
        train_i, valid_i = order[:split], order[split:]
        self.mean = x[train_i].mean(axis=0)
        self.std = x[train_i].std(axis=0) + 1e-8
        xz = (x - self.mean) / self.std
        lr = 0.045
        for epoch in range(epochs):
            batch = rng.choice(train_i, size=384, replace=False)
            xb = xz[batch]
            hidden, probabilities = self._forward(xb)
            grad_logits = probabilities
            grad_logits[np.arange(len(batch)), y[batch]] -= 1.0
            grad_logits /= len(batch)
            grad_w2 = hidden.T @ grad_logits + 1e-4 * self.w2
            grad_b2 = grad_logits.sum(axis=0)
            grad_hidden = (grad_logits @ self.w2.T) * (1.0 - hidden**2)
            grad_w1 = xb.T @ grad_hidden + 1e-4 * self.w1
            grad_b1 = grad_hidden.sum(axis=0)
            current_lr = lr * (0.30 + 0.70 * (1.0 - epoch / epochs))
            self.w2 -= current_lr * grad_w2
            self.b2 -= current_lr * grad_b2
            self.w1 -= current_lr * grad_w1
            self.b1 -= current_lr * grad_b1
        _, probabilities = self._forward(xz[valid_i])
        self.validation_accuracy = float(
            np.mean(np.argmax(probabilities, axis=1) == y[valid_i])
        )

    def decide(self, state: Iterable[float]) -> tuple[float, float, int]:
        x = (np.asarray(tuple(state), dtype=float)[None, :] - self.mean) / self.std
        _, probabilities = self._forward(x)
        index = int(np.argmax(probabilities[0]))
        gate, price = ACTIONS[index]
        return gate, price, index


def demand_profile(minute: int) -> float:
    """Two broad peak pulses during a four-hour synthetic window."""
    morning = 0.56 * math.exp(-0.5 * ((minute - 82.0) / 34.0) ** 2)
    shoulder = 0.30 * math.exp(-0.5 * ((minute - 164.0) / 44.0) ** 2)
    return 0.72 + morning + shoulder


def queue_pce(queue: deque[Vehicle]) -> float:
    return sum(vehicle.pce for vehicle in queue)


def weighted_quantile(values: list[float], weights: list[float], q: float) -> float:
    if not values:
        return 0.0
    order = np.argsort(values)
    sorted_values = np.asarray(values)[order]
    sorted_weights = np.asarray(weights)[order]
    threshold = q * sorted_weights.sum()
    return float(sorted_values[np.searchsorted(np.cumsum(sorted_weights), threshold)])


def serve_queue(
    queue: deque[Vehicle],
    capacity: float,
    minute: int,
    free_flow: float,
    facility: str,
    completed: list[dict],
) -> tuple[float, float]:
    used = 0.0
    people = 0.0
    while queue and used + queue[0].pce <= capacity + 1e-9:
        vehicle = queue.popleft()
        used += vehicle.pce
        people += vehicle.occupancy
        wait = max(0.0, minute - vehicle.arrival)
        completed.append(
            {
                "travel_time": free_flow + wait,
                "wait": wait,
                "people": vehicle.occupancy,
                "mode": vehicle.mode,
                "low_income": vehicle.low_income,
                "charge": vehicle.facility_charge,
                "facility": facility,
            }
        )
    return used, people


def simulate_corridor(
    corridor: Corridor,
    scenario: str,
    controller: NeuralGate,
    seed: int,
    demand_scale: float = 1.0,
    leakage: float = 0.0,
    incident: bool = False,
) -> dict:
    rng = np.random.default_rng(seed)
    surface: deque[Vehicle] = deque()
    managed_transit: deque[Vehicle] = deque()
    managed_other: deque[Vehicle] = deque()
    completed: list[dict] = []
    surface_peaks: list[float] = []
    managed_peaks: list[float] = []
    managed_used = 0.0
    managed_available = 0.0
    people_completed_by_240 = 0.0
    action_counts = np.zeros(len(ACTIONS), dtype=int)

    incident_start, incident_end = 112, 137
    for minute in range(MINUTES + 480):
        accepting_arrivals = minute < MINUTES
        incident_now = bool(incident and incident_start <= minute < incident_end)
        managed_capacity = 12.5 * (0.22 if incident_now else 1.0)

        if scenario == "baseline":
            gate, price, action_index = 0.0, 1.0, 0
        elif scenario == "fixed":
            gate, price, action_index = 0.60, 1.0, 4
        elif scenario == "capture":
            gate, price, action_index = 1.0, 0.80, 6
        else:
            profile = demand_profile(min(minute, MINUTES - 1)) * demand_scale
            mq = (queue_pce(managed_transit) + queue_pce(managed_other)) / 12.5
            sq = queue_pce(surface) / corridor.surface_capacity_pce_per_minute
            # Person share generated by transit-priority modes under base rates.
            transit_people = sum(
                mode.base_rate_per_minute * mode.occupancy
                for mode in MODES.values() if mode.transit_priority
            )
            all_people = sum(
                mode.base_rate_per_minute * mode.occupancy for mode in MODES.values()
            )
            gate, price, action_index = controller.decide(
                (min(mq, 3.5), min(sq, 7.0), profile, float(incident_now), transit_people / all_people)
            )
        action_counts[action_index] += 1

        if accepting_arrivals:
            intensity = demand_profile(minute) * demand_scale * corridor.demand_multiplier
            for name, mode in MODES.items():
                count = int(rng.poisson(mode.base_rate_per_minute * intensity))
                for _ in range(count):
                    low_income = bool(rng.random() < mode.low_income_probability)
                    on_managed = False
                    if scenario != "baseline":
                        if mode.transit_priority:
                            on_managed = True
                        elif name == "car_4_plus":
                            elasticity = math.exp(-0.72 * (price - 1.0))
                            if low_income:
                                elasticity *= math.exp(-0.28 * max(price - 1.0, 0.0))
                            on_managed = bool(rng.random() < min(1.0, gate * elasticity))
                        elif name == "car_1_2" and leakage > 0.0:
                            on_managed = bool(rng.random() < leakage)

                    charge = mode.facility_charge_per_vehicle * price if on_managed else 0.0
                    vehicle = Vehicle(
                        minute, name, mode.occupancy, mode.pce, low_income, charge
                    )
                    if on_managed:
                        if mode.transit_priority:
                            managed_transit.append(vehicle)
                        else:
                            managed_other.append(vehicle)
                    else:
                        surface.append(vehicle)

        surface_peaks.append(float(len(surface)))
        managed_peaks.append(float(len(managed_transit) + len(managed_other)))

        surface_used, surface_people = serve_queue(
            surface,
            corridor.surface_capacity_pce_per_minute,
            minute,
            corridor.surface_free_flow_minutes,
            "surface",
            completed,
        )

        if scenario != "baseline":
            if scenario == "capture":
                # Captured operations lose hard transit priority: merge by arrival.
                merged = deque(sorted(
                    list(managed_transit) + list(managed_other),
                    key=lambda vehicle: vehicle.arrival,
                ))
                managed_transit.clear()
                managed_other.clear()
                used, managed_people = serve_queue(
                    merged,
                    managed_capacity,
                    minute,
                    corridor.managed_free_flow_minutes,
                    "managed",
                    completed,
                )
                while merged:
                    vehicle = merged.popleft()
                    if MODES[vehicle.mode].transit_priority:
                        managed_transit.append(vehicle)
                    else:
                        managed_other.append(vehicle)
            else:
                used_transit, managed_people_1 = serve_queue(
                    managed_transit,
                    managed_capacity,
                    minute,
                    corridor.managed_free_flow_minutes,
                    "managed",
                    completed,
                )
                used_other, managed_people_2 = serve_queue(
                    managed_other,
                    max(0.0, managed_capacity - used_transit),
                    minute,
                    corridor.managed_free_flow_minutes,
                    "managed",
                    completed,
                )
                used = used_transit + used_other
                managed_people = managed_people_1 + managed_people_2
            managed_used += used
            if minute < MINUTES:
                managed_available += managed_capacity
        else:
            managed_people = 0.0

        if minute < MINUTES:
            people_completed_by_240 += surface_people + managed_people
        if not accepting_arrivals and not surface and not managed_transit and not managed_other:
            break

    values = [row["travel_time"] for row in completed]
    weights = [row["people"] for row in completed]
    people = float(sum(weights))
    queue_hours = sum(row["wait"] * row["people"] for row in completed) / 60.0
    transit_rows = [row for row in completed if MODES[row["mode"]].transit_priority]
    low_income_rows = [row for row in completed if row["low_income"]]
    total_charge = sum(row["charge"] for row in completed)
    low_income_charge = sum(row["charge"] for row in low_income_rows)
    low_income_people = sum(row["people"] for row in low_income_rows)
    transit_people = sum(row["people"] for row in transit_rows)
    transit_time = sum(row["travel_time"] * row["people"] for row in transit_rows)

    return {
        "people": people,
        "people_completed_by_240": people_completed_by_240,
        "mean_person_trip_minutes": float(np.average(values, weights=weights)),
        "p95_person_trip_minutes": weighted_quantile(values, weights, 0.95),
        "person_hours_queued": float(queue_hours),
        "mean_transit_shared_trip_minutes": float(transit_time / transit_people),
        "surface_peak_queue_vehicles": max(surface_peaks, default=0.0),
        "managed_peak_queue_vehicles": max(managed_peaks, default=0.0),
        "managed_utilization": float(managed_used / max(managed_available, 1.0)),
        "facility_charge_per_managed_person_rupees": float(
            total_charge
            / max(sum(row["people"] for row in completed if row["facility"] == "managed"), 1.0)
        ),
        "low_income_charge_per_person_rupees": float(low_income_charge / max(low_income_people, 1.0)),
        "action_counts": action_counts.tolist(),
    }


def aggregate_run(
    scenario: str,
    controller: NeuralGate,
    seed: int,
    demand_scale: float = 1.0,
    leakage: float = 0.0,
    incident: bool = False,
) -> dict:
    corridor_results = [
        simulate_corridor(
            corridor,
            scenario,
            controller,
            seed + index * 1009,
            demand_scale=demand_scale,
            leakage=leakage,
            incident=incident,
        )
        for index, corridor in enumerate(CORRIDORS)
    ]
    people = sum(row["people"] for row in corridor_results)
    result = {
        "people": people,
        "people_completed_by_240": sum(row["people_completed_by_240"] for row in corridor_results),
        "person_hours_queued": sum(row["person_hours_queued"] for row in corridor_results),
        "mean_person_trip_minutes": sum(
            row["mean_person_trip_minutes"] * row["people"] for row in corridor_results
        ) / people,
        "p95_person_trip_minutes": max(row["p95_person_trip_minutes"] for row in corridor_results),
        "mean_transit_shared_trip_minutes": sum(
            row["mean_transit_shared_trip_minutes"] * row["people"] for row in corridor_results
        ) / people,
        "surface_peak_queue_vehicles": sum(row["surface_peak_queue_vehicles"] for row in corridor_results),
        "managed_peak_queue_vehicles": sum(row["managed_peak_queue_vehicles"] for row in corridor_results),
        "managed_utilization": float(np.mean([row["managed_utilization"] for row in corridor_results])),
        "facility_charge_per_managed_person_rupees": sum(
            row["facility_charge_per_managed_person_rupees"] * row["people"] for row in corridor_results
        ) / people,
        "low_income_charge_per_person_rupees": sum(
            row["low_income_charge_per_person_rupees"] * row["people"] for row in corridor_results
        ) / people,
    }
    return result


def summarize_replications(rows: list[dict]) -> dict:
    summary = {}
    for key in rows[0]:
        values = np.array([row[key] for row in rows], dtype=float)
        summary[key] = {
            "mean": float(values.mean()),
            "p10": float(np.percentile(values, 10)),
            "p90": float(np.percentile(values, 90)),
        }
    return summary


def render_results(results: dict, sensitivity: dict) -> None:
    plt.rcParams.update({
        "font.family": "DejaVu Sans",
        "axes.titleweight": "bold",
        "axes.edgecolor": "#718078",
        "axes.labelcolor": "#21372f",
        "xtick.color": "#42584e",
        "ytick.color": "#42584e",
    })
    labels = [
        "Mixed streets\nonly",
        "Fixed public\ntransitway",
        "Neural gate\n+ transit priority",
        "Weak enforcement\n+ captured access",
        "Neural gate\n+ 25 min incident",
    ]
    keys = ["baseline", "fixed", "neural", "capture", "incident"]
    colors = ["#6d756f", "#277c71", "#175b72", "#b86138", "#9b7b32"]
    queue = [results[key]["person_hours_queued"]["mean"] for key in keys]
    queue_low = [results[key]["person_hours_queued"]["p10"] for key in keys]
    queue_high = [results[key]["person_hours_queued"]["p90"] for key in keys]
    shared = [results[key]["mean_transit_shared_trip_minutes"]["mean"] for key in keys]
    shared_low = [results[key]["mean_transit_shared_trip_minutes"]["p10"] for key in keys]
    shared_high = [results[key]["mean_transit_shared_trip_minutes"]["p90"] for key in keys]

    fig = plt.figure(figsize=(15, 9.3), facecolor="#f8f7f1")
    grid = fig.add_gridspec(2, 2, height_ratios=[1.0, 1.05], wspace=0.24, hspace=0.45)
    ax1 = fig.add_subplot(grid[0, 0], facecolor="#f8f7f1")
    ax2 = fig.add_subplot(grid[0, 1], facecolor="#f8f7f1")
    ax3 = fig.add_subplot(grid[1, :], facecolor="#f8f7f1")

    y = np.arange(len(keys))
    ax1.barh(y, queue, color=colors, height=0.68)
    ax1.errorbar(
        queue, y,
        xerr=[np.array(queue) - np.array(queue_low), np.array(queue_high) - np.array(queue)],
        fmt="none", ecolor="#21372f", elinewidth=1, capsize=3,
    )
    ax1.set_title("A. Person-hours spent in entry queues")
    ax1.set_xlabel("Person-hours over four-hour peak")
    ax1.set_yticks(y, labels, fontsize=9)
    ax1.invert_yaxis()
    ax1.grid(axis="x", color="#d8ddd6", linewidth=0.7)
    ax1.set_axisbelow(True)
    for row, value in enumerate(queue):
        ax1.text(value + max(queue) * 0.015, row, f"{value:,.0f}", va="center", fontsize=8.5, color="#21372f")
    ax1.set_xlim(0, max(queue_high) * 1.18)

    ax2.barh(y, shared, color=colors, height=0.68)
    ax2.errorbar(
        shared, y,
        xerr=[np.array(shared) - np.array(shared_low), np.array(shared_high) - np.array(shared)],
        fmt="none", ecolor="#21372f", elinewidth=1, capsize=3,
    )
    ax2.set_title("B. Bus, minibus and shared-van trip time")
    ax2.set_xlabel("Person-weighted minutes")
    ax2.set_yticks(y, labels, fontsize=9)
    ax2.invert_yaxis()
    ax2.grid(axis="x", color="#d8ddd6", linewidth=0.7)
    ax2.set_axisbelow(True)
    for row, value in enumerate(shared):
        ax2.text(value + max(shared) * 0.015, row, f"{value:.1f}", va="center", fontsize=8.5, color="#21372f")
    ax2.set_xlim(0, max(shared_high) * 1.15)

    demand_levels = sensitivity["demand_levels"]
    leakage_levels = sensitivity["leakage_levels"]
    matrix = np.asarray(sensitivity["delay_change_percent"])
    heat = ax3.imshow(matrix, cmap="RdYlGn_r", vmin=-65, vmax=25, aspect="auto")
    ax3.set_title("C. If access is captured and transit priority disappears, leakage becomes the breaking point")
    ax3.set_xlabel("Unauthorized / ineligible share entering managed lane")
    ax3.set_ylabel("Demand level")
    ax3.set_xticks(range(len(leakage_levels)), [f"{int(v * 100)}%" for v in leakage_levels])
    ax3.set_yticks(range(len(demand_levels)), [f"{v:.1f}×" for v in demand_levels])
    for row in range(matrix.shape[0]):
        for column in range(matrix.shape[1]):
            value = matrix[row, column]
            ax3.text(column, row, f"{value:+.0f}%", ha="center", va="center", color="#14231d", weight="bold")
    bar = fig.colorbar(heat, ax=ax3, pad=0.015, shrink=0.88)
    bar.set_label("Change in person-hours queued")

    fig.suptitle(
        "A transit-first deck helps in the model. Capture and incidents are the real test.",
        x=0.055, y=0.985, ha="left", fontsize=22, fontweight="bold", color="#21372f",
    )
    fig.text(
        0.055, 0.945,
        "Synthetic six-corridor queue model • 12 random replications • uncertainty bars show the 10th–90th percentile",
        ha="left", fontsize=10.5, color="#53675e",
    )
    fig.text(
        0.055, 0.018,
        "This is a stress test of assumptions, not a Bengaluru traffic forecast. The controller was trained on synthetic states and a declared transit-priority rule.",
        ha="left", fontsize=9.5, color="#53675e",
    )
    fig.savefig(OUTPUT / "transitway-simulation-summary.png", dpi=180, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)


def bezier(points: np.ndarray, samples: int = 160) -> np.ndarray:
    t = np.linspace(0.0, 1.0, samples)[:, None]
    p0, p1, p2, p3 = points
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t**2 * p2 + t**3 * p3


def render_concept_art() -> None:
    rng = np.random.default_rng(SEED)
    fig = plt.figure(figsize=(16, 10.2), facecolor="#07141b")
    ax = fig.add_axes([0.035, 0.08, 0.93, 0.84], facecolor="#07141b")
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 70)
    ax.axis("off")

    # Ground plane: dense local streets that remain local.
    for _ in range(115):
        x0, y0 = rng.uniform(2, 98), rng.uniform(2, 67)
        angle = rng.choice([0.05, 0.52, -0.45, 1.35]) + rng.normal(0, 0.09)
        length = rng.uniform(4, 18)
        x1, y1 = x0 + math.cos(angle) * length, y0 + math.sin(angle) * length * 0.55
        ax.plot([x0, x1], [y0, y1], color="#35515a", alpha=0.27, linewidth=rng.uniform(0.35, 0.95), zorder=1)

    # Protected landscapes and water remain visible in the imagined city.
    green_patches = [
        np.array([[5, 48], [16, 55], [21, 48], [16, 40], [7, 42]]),
        np.array([[67, 54], [80, 62], [95, 58], [92, 48], [77, 46]]),
        np.array([[75, 8], [90, 12], [93, 24], [81, 27], [69, 18]]),
    ]
    for patch in green_patches:
        ax.add_patch(Polygon(patch, closed=True, facecolor="#173f36", edgecolor="#3a7c66", linewidth=0.8, alpha=0.70, zorder=0))
    for cx, cy, rx, ry in [(20, 18, 7, 2.4), (86, 38, 6, 2.0)]:
        theta = np.linspace(0, 2 * np.pi, 100)
        ax.fill(cx + rx * np.cos(theta), cy + ry * np.sin(theta), color="#163b50", alpha=0.9, zorder=0)

    centre = np.array([51.0, 34.0])
    routes = [
        ("TUMAKURU / PEENYA", np.array([3.0, 57.0]), np.array([[51, 34], [40, 41], [24, 49], [3, 57]])),
        ("HEBBAL / AIRPORT", np.array([45.0, 69.0]), np.array([[51, 34], [49, 45], [48, 57], [45, 69]])),
        ("HOSKOTE / KOLAR", np.array([99.0, 56.0]), np.array([[51, 34], [63, 40], [79, 51], [99, 56]])),
        ("ELECTRONIC CITY / HOSUR", np.array([83.0, 1.5]), np.array([[51, 34], [58, 25], [71, 11], [83, 1.5]])),
        ("MYSURU ROAD", np.array([12.0, 4.0]), np.array([[51, 34], [40, 25], [24, 12], [12, 4]])),
        ("MAGADI / WEST", np.array([0.5, 26.0]), np.array([[51, 34], [39, 31], [17, 28], [0.5, 26]])),
    ]
    route_color = "#5cf0ce"
    node_color = "#e7bb68"
    for index, (name, endpoint, control) in enumerate(routes):
        path = bezier(control.astype(float))
        # Shadow beneath the elevated deck, then the deck and its two lane traces.
        ax.plot(path[:, 0] + 0.8, path[:, 1] - 1.35, color="#000000", linewidth=12, alpha=0.30, zorder=3)
        ax.plot(path[:, 0], path[:, 1], color="#1b756f", linewidth=10, alpha=0.16, zorder=4)
        ax.plot(path[:, 0], path[:, 1], color="#2aa99a", linewidth=5.5, alpha=0.78, zorder=5)
        ax.plot(path[:, 0], path[:, 1], color=route_color, linewidth=1.55, alpha=0.95, zorder=6)
        # Sparse piers/refuge nodes make the structure read as elevated.
        for step in range(22, 145, 30):
            px, py = path[step]
            ax.plot([px, px + 0.7], [py - 0.3, py - 2.3], color="#54767b", linewidth=0.8, alpha=0.8, zorder=2)
        for step in (42, 87, 128):
            px, py = path[step]
            ax.add_patch(Circle((px, py), 0.55, facecolor="#07141b", edgecolor=node_color, linewidth=1.4, zorder=8))
        # Vehicles: long marks are buses, small marks are vans/HOVs.
        for vehicle_index, step in enumerate((28, 63, 103, 137)):
            px, py = path[step]
            width = 1.5 if vehicle_index % 2 == 0 else 0.7
            ax.plot([px - width / 2, px + width / 2], [py, py], color="#f3d37f", linewidth=2.5, solid_capstyle="round", zorder=9)
        ex, ey = endpoint
        ha = "right" if ex > 70 else "left"
        tx = ex - 1 if ex > 70 else ex + 1
        ty = min(67.5, max(2.5, ey))
        ax.text(tx, ty, name, color="#9fbab7", fontsize=8.5, ha=ha, va="center", weight="bold", zorder=10)

    # Direct access nodes, shown as short ramps into named destination corridors.
    ring = Circle(tuple(centre), 7.0, fill=False, edgecolor="#a8d9ce", linewidth=1.0, alpha=0.55, zorder=7)
    ax.add_patch(ring)
    ax.add_patch(Circle(tuple(centre), 2.2, facecolor="#0d2730", edgecolor="#f0c56e", linewidth=2.0, zorder=10))
    ax.text(51, 34, "CITY\nTRANSFER", color="#f5e9ca", fontsize=7.5, ha="center", va="center", weight="bold", zorder=11)

    # Cross-section inset.
    inset = fig.add_axes([0.55, 0.09, 0.40, 0.23], facecolor="#0b1d25")
    inset.set_xlim(0, 100)
    inset.set_ylim(0, 32)
    inset.axis("off")
    inset.plot([4, 96], [5, 5], color="#60747b", linewidth=1.0)
    inset.add_patch(Rectangle((18, 18), 64, 5.0, facecolor="#245d62", edgecolor="#66d9c2", linewidth=1.0))
    inset.plot([50, 50], [18, 23], color="#d6eee7", linewidth=1.0, alpha=0.7)
    inset.add_patch(Rectangle((23, 23), 17, 2.3, facecolor="#e3bd6d", edgecolor="none"))
    inset.add_patch(Rectangle((59, 19.1), 8, 1.8, facecolor="#e3bd6d", edgecolor="none"))
    for x in (27, 72):
        inset.plot([x, x], [5, 18], color="#5c7378", linewidth=2.2)
        inset.plot([x - 2, x + 2], [5, 5], color="#5c7378", linewidth=2.2)
    inset.plot([7, 45], [7.5, 7.5], color="#83949a", linewidth=5.5)
    inset.plot([55, 94], [7.5, 7.5], color="#83949a", linewidth=5.5)
    inset.plot([5, 95], [2.5, 2.5], color="#3d8c6e", linewidth=2.0)
    for x in (10, 88):
        inset.plot([x, x], [5, 12], color="#5a876f", linewidth=1.3)
        inset.scatter([x], [12.5], s=55, c="#3f8f70")
    inset.text(50, 29.3, "ONE CONTROLLED LANE EACH WAY • BUS / MINIBUS / SHARED VAN / HOV", color="#b7d6d1", fontsize=6.8, ha="center", weight="bold")
    inset.text(50, 13.2, "periodic refuge bay • sensors • incident access", color="#799b99", fontsize=6.4, ha="center")
    inset.text(50, 0.1, "surface streets stay local: access, walking, cycling, deliveries, trees", color="#79a691", fontsize=6.4, ha="center")

    fig.text(0.045, 0.958, "BENGALURU / THE PEOPLE-MOVING DECK", color="#ecf4ef", fontsize=25, weight="bold", ha="left")
    fig.text(0.047, 0.925, "A public, limited-access network that rewards shared capacity rather than wealth", color="#92aaa8", fontsize=11, ha="left")
    fig.text(0.955, 0.955, "CONCEPT • NOT ALIGNMENT", color="#e4bd72", fontsize=9, ha="right", weight="bold")
    fig.text(0.045, 0.045, "Scheduled buses first  /  sparse direct ramps  /  no discretionary passes  /  surface streets reclaimed for local life", color="#a9bfbc", fontsize=9.5, ha="left")
    fig.savefig(ASSETS / "bengaluru-transitway-concept-art.png", dpi=180, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)


def run() -> None:
    controller = NeuralGate()
    controller.train()
    scenario_specs = {
        "baseline": dict(scenario="baseline", leakage=0.0, incident=False),
        "fixed": dict(scenario="fixed", leakage=0.0, incident=False),
        "neural": dict(scenario="neural", leakage=0.0, incident=False),
        "capture": dict(scenario="capture", leakage=0.30, incident=False),
        "incident": dict(scenario="neural", leakage=0.0, incident=True),
    }
    results = {}
    for key, spec in scenario_specs.items():
        rows = [
            aggregate_run(controller=controller, seed=SEED + replication * 7919, **spec)
            for replication in range(12)
        ]
        results[key] = summarize_replications(rows)

    demand_levels = [0.8, 1.0, 1.2]
    leakage_levels = [0.0, 0.10, 0.25, 0.40]
    delay_change = []
    for demand_scale in demand_levels:
        baseline = aggregate_run(
            "baseline", controller, SEED + int(demand_scale * 1000), demand_scale=demand_scale
        )["person_hours_queued"]
        row = []
        for leakage in leakage_levels:
            managed = aggregate_run(
                "capture",
                controller,
                SEED + int(demand_scale * 1000) + int(leakage * 10000),
                demand_scale=demand_scale,
                leakage=leakage,
            )["person_hours_queued"]
            row.append(100.0 * (managed - baseline) / max(baseline, 1.0))
        delay_change.append(row)
    sensitivity = {
        "demand_levels": demand_levels,
        "leakage_levels": leakage_levels,
        "delay_change_percent": delay_change,
    }

    payload = {
        "model_status": "synthetic stress test; not calibrated and not a forecast",
        "random_seed": SEED,
        "peak_window_minutes": MINUTES,
        "replications_per_main_scenario": 12,
        "corridors": [asdict(corridor) for corridor in CORRIDORS],
        "mode_assumptions": {name: asdict(mode) for name, mode in MODES.items()},
        "managed_lane_capacity_pce_per_minute": 12.5,
        "incident_capacity_fraction": 0.22,
        "neural_controller": {
            "architecture": "5 inputs → 18 tanh units → 9 policy actions",
            "training_data": "9,000 randomly generated synthetic traffic states",
            "target": "declared transit-priority heuristic, not observed Bengaluru outcomes",
            "validation_accuracy": controller.validation_accuracy,
            "actions": [{"admission_gate": gate, "price_multiplier": price} for gate, price in ACTIONS],
        },
        "main_scenarios": results,
        "sensitivity": sensitivity,
    }
    (OUTPUT / "transitway-simulation-results.json").write_text(
        json.dumps(payload, indent=2) + "\n"
    )
    render_results(results, sensitivity)
    render_concept_art()
    print(json.dumps({
        "validation_accuracy": controller.validation_accuracy,
        "results": {
            key: {
                "queue_hours": value["person_hours_queued"]["mean"],
                "mean_trip": value["mean_person_trip_minutes"]["mean"],
                "shared_trip": value["mean_transit_shared_trip_minutes"]["mean"],
            }
            for key, value in results.items()
        },
        "sensitivity": sensitivity,
    }, indent=2))


if __name__ == "__main__":
    run()
