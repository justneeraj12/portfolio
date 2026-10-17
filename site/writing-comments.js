(() => {
  const section = document.querySelector('[data-discussion]');
  if (!section) return;
  const api = 'https://api.github.com/repos/justneeraj12/portfolio/issues/1';
  const thread = 'https://github.com/justneeraj12/portfolio/issues/1';
  const status = section.querySelector('[data-comments-status]');
  const counts = section.querySelector('[data-comment-counts]');
  const list = section.querySelector('[data-comments-list]');
  const refresh = section.querySelector('[data-comments-refresh]');
  let loading = false;

  async function load() {
    if (loading) return;
    loading = true;
    refresh.disabled = true;
    status.textContent = 'Loading the conversation…';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    const options = {
      headers: { Accept: 'application/vnd.github.text+json' },
      credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal,
    };
    try {
      const issueResponse = await fetch(api, options);
      if (!issueResponse.ok) throw new Error('Discussion unavailable');
      const issue = await issueResponse.json();
      if (!Number.isInteger(issue.comments) || issue.comments < 0) throw new Error('Invalid discussion');
      const reactions = issue.reactions?.total_count;
      counts.textContent = `${issue.comments} ${issue.comments === 1 ? 'comment' : 'comments'}` +
        (Number.isInteger(reactions) ? ` · ${reactions} ${reactions === 1 ? 'reaction' : 'reactions'}` : '');
      let comments = [];
      if (issue.comments > 0) {
        const page = Math.max(1, Math.ceil(issue.comments / 30));
        const response = await fetch(`${api}/comments?per_page=30&page=${page}`, options);
        if (!response.ok) throw new Error('Comments unavailable');
        comments = await response.json();
        if (!Array.isArray(comments)) throw new Error('Invalid comments');
      }
      const items = comments.filter(comment => !comment.minimized).reverse().map(comment => {
        const item = document.createElement('li');
        const author = document.createElement('a');
        // Construct the URL from a numeric ID; never render user-supplied HTML.
        author.href = /^\d+$/.test(String(comment.id)) ? `${thread}#issuecomment-${comment.id}` : thread;
        author.target = '_blank';
        author.rel = 'noopener noreferrer';
        author.textContent = comment.user?.login || 'GitHub reader';
        const date = document.createElement('time');
        if (Number.isFinite(Date.parse(comment.created_at))) {
          date.dateTime = comment.created_at;
          date.textContent = new Date(comment.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }
        const body = document.createElement('p');
        body.textContent = comment.body_text ?? comment.body ?? '';
        item.append(author, date, body);
        return item;
      });
      list.replaceChildren(...items);
      status.textContent = issue.comments === 0 ? 'No comments yet. What does this argument miss?' :
        'Latest comments shown below. Open GitHub for the full conversation.';
    } catch {
      status.textContent = 'Comments could not be refreshed here. You can still read, comment, or react on GitHub using the links below.';
    } finally {
      window.clearTimeout(timeout);
      loading = false;
      refresh.disabled = false;
    }
  }
  refresh.hidden = false;
  refresh.addEventListener('click', load);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
    }, { rootMargin: '500px' });
    observer.observe(section);
  } else load();
})();
