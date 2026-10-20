import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const html = readFileSync("site/index.html", "utf8");
const css = readFileSync("site/styles.css", "utf8");
const script = readFileSync("site/script.js", "utf8");

test("required static assets exist and are non-empty", () => {
  for (const file of [
    "site/index.html",
    "site/styles.css",
    "site/script.js",
    "site/neeraj-kanchani-resume.pdf",
    "site/favicon.svg",
    "site/social-card.png",
    "site/robots.txt",
    "site/sitemap.xml",
    "site/404.html",
    "site/.nojekyll"
  ]) {
    assert.ok(existsSync(file), `${file} should exist`);
    if (!file.endsWith(".nojekyll")) assert.ok(statSync(file).size > 0, `${file} should not be empty`);
  }
});

test("Bengaluru essay and its seven evidence figures are published", () => {
  const root = "site/writing/before-bengaluru-gets-bigger";
  for (const file of [
    `${root}/index.html`,
    `${root}/before-bengaluru-gets-bigger-social.png`,
    `${root}/assets/bengaluru-region-proposal.svg`,
    `${root}/assets/bengaluru-cityways-hex-study.svg`,
    `${root}/assets/bengaluru-cityways-exit-rule.svg`,
    `${root}/assets/bel-circle-network-sketch.png`,
    `${root}/assets/nys-adirondack-lean-to-1973.webp`,
    `${root}/assets/nys-dec-trail-marker.webp`,
    `${root}/assets/nys-attraction-wayfinding.webp`,
    `${root}/assets/nys-route9g-historic-sites.webp`,
    `${root}/assets/nys-orient-beach-road-sign.webp`,
    `${root}/assets/nys-route20-scenic-byway.webp`,
    `${root}/assets/nyc-new-amsterdam-wall-plaque.webp`,
    `${root}/assets/nyc-triangle-fire-memorial.webp`,
    `${root}/assets/nyc-mta-covid-memorial.webp`,
    `${root}/output/transitway-simulation-summary.png`,
  ]) {
    assert.ok(existsSync(file), `${file} should exist`);
    assert.ok(statSync(file).size > 0, `${file} should not be empty`);
  }
  const essay = readFileSync(`${root}/index.html`, "utf8");
  assert.match(essay, /43 min read/);
  assert.match(essay, /data-issue="2"/);
  assert.equal((essay.match(/<figure\b/g) ?? []).length, 7);
  assert.equal((essay.match(/<img\b/g) ?? []).length, 14);
  assert.ok(html.includes("writing/before-bengaluru-gets-bigger/"));
});

test("page has one primary heading and all required sections", () => {
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  for (const id of ["top", "proof", "fit", "experience", "about", "contact"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test("navigation anchors resolve to page ids", () => {
  const anchors = [...html.matchAll(/href="#([a-z][\w-]*)"/g)].map((match) => match[1]);
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  for (const anchor of anchors) assert.ok(ids.has(anchor), `#${anchor} should resolve`);
});

test("required claims and evidence boundaries are present", () => {
  for (const phrase of [
    "M.S. Electrical &amp; Computer Engineering",
    "Expected December 2026",
    "B.E. Artificial Intelligence &amp; Machine Learning",
    "Nocturne Operations Console",
    "Vision-only warehouse convoy",
    "Face Unlock for Linux",
    "Cross-lingual speech emotion",
    "Simulation-validated",
    "How I tend to"
  ]) assert.ok(html.includes(phrase), `missing: ${phrase}`);
  assert.ok(!html.toLowerCase().includes(["car", "roll"].join("")));
});

test("production metadata and accessibility affordances are present", () => {
  for (const phrase of [
    'rel="canonical"',
    'property="og:title"',
    'type="application/ld+json"',
    'class="skip-link"',
    'prefers-reduced-motion',
    'aria-label="Primary navigation"'
  ]) assert.ok(html.includes(phrase) || css.includes(phrase), `missing: ${phrase}`);
  assert.ok(script.includes("navigator.clipboard"));
  assert.ok(script.includes("roleData"));
});

test("site has no external runtime dependencies", () => {
  assert.ok(!html.match(/<script[^>]+src="https?:\/\//));
  assert.ok(!html.match(/<link[^>]+rel="stylesheet"[^>]+href="https?:\/\//));
  assert.ok(!css.match(/@import\s+url\(["']?https?:\/\//));
});
