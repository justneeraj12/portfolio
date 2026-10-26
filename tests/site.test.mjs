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
    "site/writings/index.html",
    "site/404.html",
    "site/.nojekyll"
  ]) {
    assert.ok(existsSync(file), `${file} should exist`);
    if (!file.endsWith(".nojekyll")) assert.ok(statSync(file).size > 0, `${file} should not be empty`);
  }
});

test("Writing navigation uses the shareable writings address", () => {
  const writingsRoute = readFileSync("site/writings/index.html", "utf8");
  assert.equal((html.match(/href="writings\/"/g) ?? []).length, 2);
  assert.match(writingsRoute, /url=\.\.\/#writing/);
  assert.match(writingsRoute, /https:\/\/justneeraj12\.github\.io\/portfolio\/#writing/);
});

test("Bengaluru essay and its ten evidence figures are published", () => {
  const root = "site/writing/before-bengaluru-gets-bigger";
  for (const file of [
    `${root}/index.html`,
    `${root}/before-bengaluru-gets-bigger-social-v3.png`,
    `${root}/assets/bengaluru-region-proposal.svg`,
    `${root}/assets/bengaluru-cityways-hex-study.svg`,
    `${root}/assets/bengaluru-cityways-exit-rule.svg`,
    `${root}/assets/bel-circle-network-sketch.png`,
    `${root}/assets/bel-circle-r1-lane-plan.svg`,
    `${root}/assets/bel-circle-r1-footprint-constraints.svg`,
    `${root}/assets/bel-circle-r1-pedestrian-bus-plan.svg`,
    `${root}/assets/bel-circle-r1-design-basis.pdf`,
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
  assert.match(essay, /49 min read/);
  assert.match(essay, /data-issue="2"/);
  assert.equal((essay.match(/<li><strong>(?:The Regional Compact|The Hex-Cell Gateway Model|Managed CityWays priority|Pre-construction governance locks)\./g) ?? []).length, 4);
  assert.equal((essay.match(/class="throughput-math"[\s\S]*?<\/div>/g) ?? []).length, 1);
  assert.match(essay, /zero raw-video hoarding by default/);
  assert.match(essay, /href="\.\.\/the-one-centimeter-advantage\/"/);
  assert.equal((essay.match(/<figure\b/g) ?? []).length, 10);
  assert.equal((essay.match(/<img\b/g) ?? []).length, 17);
  assert.ok(html.includes("writing/before-bengaluru-gets-bigger/"));
});

test("page has one primary heading and all required sections", () => {
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  for (const id of ["top", "work", "experience", "about", "writing", "contact"]) {
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
    "Clarkson University",
    "Nocturne Operations Console",
    "Vision-only leader-follower warehouse convoy",
    "CPU-first local face authentication for Linux",
    "Cross-lingual speech emotion recognition",
    "Building calm, debuggable software"
  ]) assert.ok(html.includes(phrase), `missing: ${phrase}`);
  assert.ok(!html.toLowerCase().includes(["car", "roll"].join("")));
});

test("field manual presents concrete project and experience evidence", () => {
  for (const phrase of [
    "30</strong> disturbance runs / 0 hits",
    "23.09 ms</strong> cam-to-meas p95",
    "61</strong> passing CI tests",
    "12.6 ms</strong> embedding p95",
    "13</strong> corpus splits",
    "200-node wireless network",
    "92% real-world obstacle avoidance",
    "four drone prototypes"
  ]) assert.ok(html.includes(phrase), `homepage should include: ${phrase}`);
  assert.equal((html.match(/data-system="[1-4]"/g) ?? []).length, 4);
  assert.equal((html.match(/data-deep-spec/g) ?? []).length, 4);
  assert.equal((html.match(/class="metric-strip"/g) ?? []).length, 4);
});

test("telemetry controls and keyboard navigation are wired", () => {
  for (const phrase of [
    "data-mode-toggle",
    "data-scan-toggle",
    "data-fault-trigger",
    "data-cursor-x",
    "data-telemetry=",
    "portfolio-mode",
    "localStorage",
    "scrollIntoView",
    'key === "n"',
    'key === "f"',
    'key === "d"',
    'key === "w"'
  ]) assert.ok(html.includes(phrase) || script.includes(phrase), `missing interaction: ${phrase}`);
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
  assert.ok(script.includes("IntersectionObserver"));
});

test("site has no external scripts or CSS imports", () => {
  assert.ok(!html.match(/<script[^>]+src="https?:\/\//));
  const externalStyles = [...html.matchAll(/<link[^>]+href="(https?:\/\/[^\"]+)"[^>]*rel="stylesheet"/g)].map((match) => match[1]);
  assert.deepEqual(externalStyles, [externalStyles[0]].filter(Boolean));
  if (externalStyles[0]) assert.match(externalStyles[0], /^https:\/\/fonts\.googleapis\.com\//);
  assert.ok(!css.match(/@import\s+url\(["']?https?:\/\//));
});
