(() => {
  const header = document.querySelector("[data-header]");
  const sections = [...document.querySelectorAll("[data-section]")];
  const navLinks = [...document.querySelectorAll("[data-nav]")];
  const dialog = document.querySelector("[data-command-dialog]");
  const openButton = document.querySelector("[data-command-open]");
  const input = document.querySelector("[data-command-input]");
  const commandItems = [...document.querySelectorAll("[data-command-list] [data-label]")];
  const copyButton = document.querySelector("[data-copy-email]");

  const syncHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const active = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!active) return;
        navLinks.forEach((link) => {
          if (link.dataset.nav === active.target.id) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-35% 0px -52%", threshold: [0, 0.1, 0.25, 0.5] }
    );
    sections.forEach((section) => observer.observe(section));
  }

  const openDialog = () => {
    if (!dialog?.open) dialog?.showModal();
    input.value = "";
    commandItems.forEach((item) => { item.hidden = false; });
    window.setTimeout(() => input?.focus(), 40);
  };

  openButton?.addEventListener("click", openDialog);
  document.addEventListener("keydown", (event) => {
    const shortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
    const slash = event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
    if (shortcut || slash) {
      event.preventDefault();
      openDialog();
    }
  });

  input?.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    commandItems.forEach((item) => { item.hidden = !item.dataset.label.includes(query); });
  });

  input?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const firstVisible = commandItems.find((item) => !item.hidden);
    firstVisible?.click();
  });

  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.querySelectorAll("[data-command]").forEach((item) => {
    item.addEventListener("click", () => {
      const target = document.getElementById(item.dataset.command);
      dialog?.close();
      target?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
  });

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
