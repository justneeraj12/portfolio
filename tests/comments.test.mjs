import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const code = readFileSync('site/writing-comments.js', 'utf8');
function node() {
  return { textContent: '', children: [], append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    addEventListener(event, callback) { this[event] = callback; },
    set innerHTML(_) { throw new Error('Unsafe HTML rendering'); },
  };
}
async function setup(responses, dataset = undefined) {
  const parts = Object.fromEntries(['status','counts','list','refresh'].map(key => [key, node()]));
  const map = { '[data-comments-status]': parts.status, '[data-comment-counts]': parts.counts,
    '[data-comments-list]': parts.list, '[data-comments-refresh]': parts.refresh };
  const requests = [];
  runInNewContext(code, {
    document: { querySelector: () => ({ dataset, querySelector: selector => map[selector] }), createElement: node },
    window: { setTimeout: () => 1, clearTimeout() {} }, AbortController,
    fetch: async (url, options) => {
      requests.push({url,options});
      const result = responses.shift();
      if (!result) throw new Error('No fixture');
      return { ok: result.ok !== false, json: async () => result.data };
    },
  });
  await new Promise(resolve => setImmediate(resolve));
  return {parts,requests};
}

test('empty discussion displays real zero counts without requesting comments', async () => {
  const {parts,requests} = await setup([{data:{comments:0,reactions:{total_count:0}}}]);
  assert.equal(parts.counts.textContent, '0 comments · 0 reactions');
  assert.match(parts.status.textContent,/No comments yet/);
  assert.equal(requests.length,1);
  assert.equal(requests[0].options.credentials,'omit');
});

test('API failure keeps an actionable fallback without inventing counts', async () => {
  const {parts} = await setup([{ok:false}]);
  assert.equal(parts.counts.textContent,'');
  assert.match(parts.status.textContent,/still read, comment, or react on GitHub/);
  assert.equal(parts.refresh.disabled,false);
});

test('comments render as text, ignore supplied URLs, and omit minimized comments', async () => {
  const {parts} = await setup([
    {data:{comments:2,reactions:{total_count:4}}},
    {data:[{id:42,user:{login:'reader'},body_text:'<script>alert(1)</script>',html_url:'javascript:alert(1)',created_at:'2026-10-17T00:00:00Z'},
      {id:43,minimized:{reason:'spam'},body_text:'hidden'}]},
  ]);
  assert.equal(parts.list.children.length,1);
  const [author,,body] = parts.list.children[0].children;
  assert.equal(body.textContent,'<script>alert(1)</script>');
  assert.equal(author.href,'https://github.com/justneeraj12/portfolio/issues/1#issuecomment-42');
});

test('article data selects its own GitHub issue', async () => {
  const {requests} = await setup([{data:{comments:0,reactions:{total_count:0}}}], {repo:'justneeraj12/portfolio',issue:'2'});
  assert.equal(requests[0].url,'https://api.github.com/repos/justneeraj12/portfolio/issues/2');
});
