import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('site/writing.js', 'utf8');
const url = 'https://justneeraj12.github.io/portfolio/writing/the-one-centimeter-advantage/';
function setup(navigator) {
  const input = { focus() { this.focused = true; }, select() { this.selected = true; } };
  const button = () => ({ hidden: true, addEventListener(event, handler) { this[event] = handler; } });
  const elements = {
    'link[rel="canonical"]': { href: url },
    h1: { textContent: 'The One-Centimeter Advantage' },
    '[data-share-status]': { textContent: '' },
    '[data-share-fallback]': { hidden: true, querySelector: () => input },
    '[data-copy-link]': button(),
    '[data-share]': button(),
  };
  runInNewContext(source, { navigator, document: { querySelector: selector => elements[selector] } });
  return { elements, input };
}

test('unsupported native sharing copies the public canonical link', async () => {
  let copied;
  const { elements } = setup({ clipboard: { writeText: async value => { copied = value; } } });
  await elements['[data-share]'].click();
  assert.equal(copied, url);
  assert.equal(elements['[data-share-status]'].textContent, 'Link copied.');
});

test('blocked clipboard leaves a usable selected link', async () => {
  const { elements, input } = setup({ clipboard: { writeText: async () => { throw new Error('denied'); } } });
  await elements['[data-copy-link]'].click();
  assert.equal(elements['[data-share-fallback]'].hidden, false);
  assert.equal(input.value, url);
  assert.ok(input.focused && input.selected);
  assert.equal(elements['[data-share-status]'].textContent, 'Select and copy the link below.');
});

test('cancelling the native share dialog does not overwrite the clipboard', async () => {
  let copied = false;
  const { elements } = setup({
    share: async () => { throw Object.assign(new Error('cancelled'), { name: 'AbortError' }); },
    clipboard: { writeText: async () => { copied = true; } },
  });
  await elements['[data-share]'].click();
  assert.equal(copied, false);
  assert.equal(elements['[data-share-fallback]'].hidden, true);
});
