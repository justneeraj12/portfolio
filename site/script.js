(() => {
  const root = document.documentElement;
  const modeButton = document.querySelector("[data-mode-toggle]");
  const scanButton = document.querySelector("[data-scan-toggle]");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const deepSpecs = [...document.querySelectorAll("[data-deep-spec]")];

  const readStoredMode = () => {
    try {
      const mode = window.localStorage.getItem("portfolio-mode");
      return mode === "nocturne" ? "nocturne" : "paper";
    } catch {
      return "paper";
    }
  };

  const applyMode = (mode, persist = true) => {
    const nextMode = mode === "nocturne" ? "nocturne" : "paper";
    root.dataset.mode = nextMode;
    if (themeMeta) themeMeta.content = nextMode === "nocturne" ? "#07090a" : "#edf0eb";
    if (modeButton) {
      modeButton.textContent = nextMode === "nocturne"
        ? "[ SWITCH TO PAPER ☀ ]"
        : "[ SWITCH TO NOCTURNE ☾ ]";
      modeButton.setAttribute("aria-pressed", String(nextMode === "nocturne"));
    }
    if (persist) {
      try { window.localStorage.setItem("portfolio-mode", nextMode); } catch { /* storage can be disabled */ }
    }
  };

  const toggleMode = () => applyMode(root.dataset.mode === "nocturne" ? "paper" : "nocturne");
  applyMode(readStoredMode(), false);
  modeButton?.addEventListener("click", toggleMode);

  const setScanMode = (deep) => {
    root.dataset.scan = deep ? "deep" : "recruiter";
    deepSpecs.forEach((details) => { details.open = deep; });
    if (scanButton) {
      scanButton.textContent = deep ? "[ SCAN: DEEP ARCHITECTURE ]" : "[ SCAN: 30s RECRUITER ]";
      scanButton.setAttribute("aria-pressed", String(deep));
    }
  };

  const toggleScanMode = () => setScanMode(root.dataset.scan !== "deep");
  scanButton?.addEventListener("click", toggleScanMode);

  const simulatorStates = [
    {
      name: "NOMINAL",
      sensor: "YOLOv8n RGB VALID (100%, 9.02 ms p95)",
      camera: "23.09 ms p95",
      control: "48.35 ms p95",
      rmse: "0.0523 m (0 collisions)",
      hardware: "RTX 3050 Ti (642 MiB VRAM / 0.9996 RTF)",
      action: "[ INJECT VISUAL BLACKOUT ⚡ ]"
    },
    {
      name: "DROPOUT",
      sensor: "CAMERA BLACKOUT + YAW BIAS INJECTED",
      camera: "STALE FRAME (>150 ms)",
      control: "WHEEL ODOMETRY PROPAGATION",
      rmse: "0.0739 m (bounded drift)",
      hardware: "SUPERVISOR TIMER ACTIVE",
      action: "[ EXCEED TIMEOUT → SAFE STOP ]"
    },
    {
      name: "HALTED",
      sensor: "TIMEOUT EXCEEDED // FAIL-SAFE TRIGGERED",
      camera: "HALTED SAFELY",
      control: "ZERO VELOCITY COMMAND",
      rmse: "0.1004 m worst-case (0 collisions across 30 runs)",
      hardware: "BOUNDED DECELERATION COMPLETE",
      action: "[ RESET SUPERVISOR ↺ ]"
    }
  ];

  const faultButton = document.querySelector("[data-fault-trigger]");
  const simStatus = document.querySelector("[data-sim-status]");
  const stateNodes = [...document.querySelectorAll("[data-state-node]")];
  let simulatorState = 0;

  const renderSimulator = () => {
    const state = simulatorStates[simulatorState];
    if (simStatus) simStatus.textContent = state.name;
    if (faultButton) faultButton.textContent = state.action;
    Object.entries(state).forEach(([key, value]) => {
      const field = document.querySelector(`[data-telemetry="${key}"]`);
      if (field) field.textContent = value;
    });
    stateNodes.forEach((node, index) => node.classList.toggle("is-active", index === simulatorState));
    document.querySelector("[data-simulator]")?.setAttribute("data-state", String(simulatorState));
  };

  const injectFault = () => {
    simulatorState = (simulatorState + 1) % simulatorStates.length;
    renderSimulator();
  };

  faultButton?.addEventListener("click", injectFault);

  const cursorX = document.querySelector("[data-cursor-x]");
  const cursorY = document.querySelector("[data-cursor-y]");
  let pendingPoint;
  let cursorFrame;
  window.addEventListener("mousemove", (event) => {
    pendingPoint = [event.clientX, event.clientY];
    if (cursorFrame) return;
    cursorFrame = window.requestAnimationFrame(() => {
      const [x, y] = pendingPoint;
      if (cursorX) cursorX.textContent = String(Math.round(x)).padStart(4, "0");
      if (cursorY) cursorY.textContent = String(Math.round(y)).padStart(4, "0");
      cursorFrame = null;
    });
  }, { passive: true });

  const navLinks = [...document.querySelectorAll("[data-nav]")];
  const sections = [...document.querySelectorAll("[data-section]")];
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const active = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!active) return;
      navLinks.forEach((link) => {
        if (link.dataset.nav === active.target.id) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-20% 0px -68%", threshold: [0, .1, .25] });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  const jumpToSystem = (number) => {
    const target = document.querySelector(`[data-system="${number}"]`);
    if (!target) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    target.scrollIntoView({ behavior, block: "center" });
    target.classList.remove("is-key-target");
    window.requestAnimationFrame(() => target.classList.add("is-key-target"));
    window.setTimeout(() => target.classList.remove("is-key-target"), 1000);
  };

  window.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    const key = event.key.toLowerCase();
    if (key === "n") toggleMode();
    else if (key === "f") injectFault();
    else if (key === "d") toggleScanMode();
    else if (/^[1-4]$/.test(key)) jumpToSystem(key);
    else if (key === "w") {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      document.querySelector("#writing")?.scrollIntoView({ behavior });
    }
  });

  const copyButton = document.querySelector("[data-copy-email]");
  copyButton?.addEventListener("click", async () => {
    const original = copyButton.textContent;
    try {
      await navigator.clipboard.writeText(copyButton.dataset.email);
      copyButton.textContent = "[ EMAIL COPIED ]";
    } catch {
      copyButton.textContent = "[ COPY UNAVAILABLE ]";
    }
    window.setTimeout(() => { copyButton.textContent = original; }, 1800);
  });
})();
