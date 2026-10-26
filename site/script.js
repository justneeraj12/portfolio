(() => {
  document.documentElement.classList.add("reveal-ready");

  const header = document.querySelector("[data-header]");
  const sections = [...document.querySelectorAll("[data-section]")];
  const navLinks = [...document.querySelectorAll("[data-nav]")];
  const revealItems = [...document.querySelectorAll("[data-reveal]")];

  const syncHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
  syncHeader();
  let scrollFrame;
  window.addEventListener("scroll", () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      syncHeader();
      scrollFrame = null;
    });
  }, { passive: true });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const active = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!active) return;
      navLinks.forEach((link) => {
        if (link.dataset.nav === active.target.id) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-30% 0px -58%", threshold: [0, .1, .25] });

    sections.forEach((section) => observer.observe(section));

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: .08 });

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

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
})();
