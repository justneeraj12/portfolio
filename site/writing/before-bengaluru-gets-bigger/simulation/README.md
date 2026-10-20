# Bengaluru high-occupancy transitway stress test

This folder contains a deliberately synthetic test of the proposed public, limited-access elevated network. It asks whether separating buses, minibuses, shared vans, and qualifying HOVs from mixed surface traffic can reduce person-delay—and what happens when demand rises, enforcement leaks, or a one-lane section is blocked.

It is **not a Bengaluru traffic forecast**. The six corridors are conceptual archetypes. Demand, occupancy, capacity, income-group probability, incident duration, and prices are stated scenario assumptions. No result should be used for route selection, investment appraisal, environmental clearance, or engineering design.

The neural component is small on purpose. A five-input, one-hidden-layer NumPy network learns to imitate a declared transit-priority control rule. It changes the admission gate and a bounded price multiplier for qualifying private HOVs. Scheduled buses, minibuses, and shared vans retain priority. The network is trained on generated states, not Bengaluru sensor data, so its result demonstrates a control method rather than real-world predictive accuracy.

Run it with:

```bash
python3 simulation/high_occupancy_transitway_sim.py
```

The script writes:

- `output/transitway-simulation-results.json`: assumptions, controller details, scenario summaries, and sensitivity results.
- `output/transitway-simulation-summary.png`: publication graphic with uncertainty across random replications.
- `assets/bengaluru-transitway-concept-art.png`: stylised city-scale concept image. It is a concept, not an alignment map.

The failure scenarios are part of the argument. “Weak enforcement + captured access” admits ineligible cars and removes hard transit priority. The incident scenario reduces the one-lane facility to 22% of normal capacity for 25 minutes. A credible next stage would replace every synthetic input with observed turning counts, bus AVL/GPS data, origin-destination samples, ramp geometry, crash and incident records, and distributional data collected with privacy protections.
