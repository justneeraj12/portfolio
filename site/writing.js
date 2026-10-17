(() => {
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
