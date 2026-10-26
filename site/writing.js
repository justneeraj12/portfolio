(() => {
  const root = document.documentElement;
  const browserWindow = typeof window === 'undefined' ? null : window;
  const modeButton = document.querySelector('[data-writing-mode-toggle]');
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  const readStoredMode = () => {
    try {
      return browserWindow?.localStorage.getItem('portfolio-mode') === 'nocturne' ? 'nocturne' : 'paper';
    } catch {
      return 'paper';
    }
  };

  const applyMode = (mode, persist = true) => {
    const nextMode = mode === 'nocturne' ? 'nocturne' : 'paper';
    if (root) root.dataset.mode = nextMode;
    if (themeMeta) themeMeta.content = nextMode === 'nocturne' ? '#07090a' : '#edf0eb';
    if (modeButton) {
      modeButton.textContent = nextMode === 'nocturne'
        ? '[ SWITCH TO PAPER ]'
        : '[ SWITCH TO NOCTURNE ]';
      modeButton.setAttribute('aria-pressed', String(nextMode === 'nocturne'));
    }
    if (persist) {
      try { browserWindow?.localStorage.setItem('portfolio-mode', nextMode); } catch { /* storage can be disabled */ }
    }
  };

  applyMode(readStoredMode(), false);
  modeButton?.addEventListener('click', () => {
    applyMode(root?.dataset.mode === 'nocturne' ? 'paper' : 'nocturne');
  });
  browserWindow?.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    if (event.key.toLowerCase() === 'n') applyMode(root?.dataset.mode === 'nocturne' ? 'paper' : 'nocturne');
  });

  if (browserWindow && root && document.body && document.createElement) {
    const progress = document.createElement('div');
    progress.className = 'reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.prepend(progress);
    let progressFrame;
    const updateProgress = () => {
      if (progressFrame) return;
      progressFrame = browserWindow.requestAnimationFrame(() => {
        const scrollable = root.scrollHeight - browserWindow.innerHeight;
        const ratio = scrollable > 0 ? Math.min(1, browserWindow.scrollY / scrollable) : 0;
        progress.style.transform = `scaleX(${ratio})`;
        progressFrame = null;
      });
    };
    browserWindow.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  if (!canonical) return;
  const title = document.querySelector('h1').textContent;
  const status = document.querySelector('[data-share-status]');
  const fallback = document.querySelector('[data-share-fallback]');
  const input = fallback.querySelector('input');
  input.value = canonical;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(canonical);
      status.textContent = 'Link copied.';
      fallback.hidden = true;
    } catch {
      fallback.hidden = false;
      input.focus();
      input.select();
      status.textContent = 'Select and copy the link below.';
    }
  }

  const copy = document.querySelector('[data-copy-link]');
  copy.hidden = false;
  copy.addEventListener('click', copyLink);
  const share = document.querySelector('[data-share]');
  share.hidden = false;
  share.addEventListener('click', async () => {
    status.textContent = '';
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title, url: canonical });
    } catch (error) {
      if (error.name !== 'AbortError') await copyLink();
    }
  });
})();
