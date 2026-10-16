(() => {
  const roleData = {
    robotics: {
      kicker: "ROBOTICS SOFTWARE",
      title: "I like working across the stack.",
      copy: "Perception, state estimation, control, simulation, and the tests that keep the pieces working together.",
      evidence: [
        "ROS 2 convoy architecture across five packages and isolated namespaces",
        "Real-time perception profiled from camera frame to control command",
        "Field-tested UAV/UUV perception and control workflows"
      ],
      skills: ["ROS 2", "C++", "Python", "Gazebo", "OpenCV"],
      href: "https://github.com/justneeraj12/ee616-vision-leader-follower"
    },
    systems: {
      kicker: "LINUX SYSTEMS",
      title: "I care about the boring reliability details.",
      copy: "Native Linux interfaces, event-driven services, reversible installation, explicit permissions, and recovery paths that are planned before failure.",
      evidence: [
        "One Qt 6 and Wayland control plane replacing a fragmented widget stack",
        "Fail-closed PAM authentication with a minimal C boundary",
        "Clean Ubuntu and Arch CI with documented rollback and verification"
      ],
      skills: ["Modern C++", "Qt 6", "Linux", "Wayland", "D-Bus"],
      href: "https://github.com/justneeraj12/nocturne-hyprland"
    },
    ml: {
      kicker: "APPLIED ML",
      title: "I look past the model score.",
      copy: "I pay attention to data boundaries, latency, leakage, interpretability, and whether an inference result is useful inside the larger system.",
      evidence: [
        "YOLOv8n perception profiled at 9.02 ms p95 inference latency",
        "Speaker-independent cross-lingual research design with leakage controls",
        "Predictive modeling across more than 10,000 medical samples"
      ],
      skills: ["PyTorch", "YOLO", "OpenCV", "Signal processing", "Evaluation"],
      href: "https://github.com/justneeraj12/cross-lingual-speech-emotion-recognition"
    }
  };

  const header = document.querySelector("[data-header]");
  const sections = [...document.querySelectorAll("[data-section]")];
  const navLinks = [...document.querySelectorAll("[data-nav]")];
  const roleTabs = [...document.querySelectorAll("[data-role-tab]")];

  const syncHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const active = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!active) return;
      navLinks.forEach((link) => {
        if (link.dataset.nav === active.target.id) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-34% 0px -54%", threshold: [0, .1, .25, .5] });
    sections.forEach((section) => observer.observe(section));
  }

  const renderRole = (name) => {
    const role = roleData[name];
    if (!role) return;
    document.querySelector("[data-role-kicker]").textContent = role.kicker;
    document.querySelector("[data-role-title]").textContent = role.title;
    document.querySelector("[data-role-copy]").textContent = role.copy;
    document.querySelector("[data-role-evidence]").replaceChildren(...role.evidence.map((item, index) => {
      const li = document.createElement("li");
      const number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      li.append(number, document.createTextNode(item));
      return li;
    }));
    document.querySelector("[data-role-skills]").replaceChildren(...role.skills.map((skill) => {
      const span = document.createElement("span");
      span.textContent = skill;
      return span;
    }));
    document.querySelector("[data-role-link]").href = role.href;
    roleTabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.roleTab === name)));
  };

  roleTabs.forEach((tab) => {
    tab.addEventListener("click", () => renderRole(tab.dataset.roleTab));
    tab.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const next = roleTabs[(roleTabs.indexOf(tab) + direction + roleTabs.length) % roleTabs.length];
      next.focus();
      next.click();
    });
  });

  const copyButton = document.querySelector("[data-copy-email]");
  copyButton?.addEventListener("click", async () => {
    const original = copyButton.textContent;
    try {
      await navigator.clipboard.writeText(copyButton.dataset.email);
      copyButton.textContent = "Copied";
    } catch {
      copyButton.textContent = "Copy unavailable";
    }
    window.setTimeout(() => { copyButton.textContent = original; }, 1800);
  });

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
})();
