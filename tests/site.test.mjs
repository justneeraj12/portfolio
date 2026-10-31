import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const html = readFileSync("site/index.html", "utf8");
const css = readFileSync("site/styles.css", "utf8");
const script = readFileSync("site/script.js", "utf8");
const writingCss = readFileSync("site/writing.css", "utf8");
const writingScript = readFileSync("site/writing.js", "utf8");
const essays = [
  readFileSync("site/writing/the-one-centimeter-advantage/index.html", "utf8"),
  readFileSync("site/writing/before-bengaluru-gets-bigger/index.html", "utf8"),
  readFileSync("site/writing/the-white-collar-mirage/index.html", "utf8"),
];

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

test("white-collar essay publishes its sources, figures, and interactive scenario", () => {
  const root = "site/writing/the-white-collar-mirage";
  for (const file of [
    `${root}/index.html`,
    `${root}/white-collar-mirage-social.png`,
    `${root}/assets/mirage.css`,
    `${root}/assets/global-wage-ripple.css`,
    `${root}/assets/global-wage-ripple.js`,
    `${root}/assets/d3.v7.9.0.min.js`,
    `${root}/assets/d3-LICENSE.txt`,
    `${root}/assets/soi-india-outline.geojson`,
    `${root}/assets/ne_110m_admin_0_countries.geojson`,
    "docs/writing/the-white-collar-mirage.md",
  ]) {
    assert.ok(existsSync(file), `${file} should exist`);
    assert.ok(statSync(file).size > 0, `${file} should not be empty`);
  }
  const essay = essays[2];
  assert.match(essay, /30 min read/);
  assert.match(essay, /data-issue="3"/);
  assert.match(essay, /id="global-scenario"/);
  assert.equal((essay.match(/<figure\b/g) ?? []).length, 6);
  for (const source of [
    "ccnmtl.columbia.edu/projects/mmt/ambedkar/web/section_14.html",
    "gutenberg.org/files/55308/55308-h/55308-h.htm",
    "gutenberg.org/files/40766/40766-h/40766-h.htm",
    "beta.perseus.tufts.edu/urn%3Acts%3AgreekLit%3Atlg0011.tlg002.jebb1904-eng1%3A724/",
  ]) assert.ok(essay.includes(source), `missing quote source: ${source}`);
  const ids = [...essay.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, "article IDs should be unique");
  for (const [, anchor] of essay.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(ids.includes(anchor), `missing article target: #${anchor}`);
  }
  assert.ok(html.includes("writing/the-white-collar-mirage/"));
});

test("writing pages use the field manual design and shared Nocturne mode", () => {
  for (const essay of essays) {
    assert.match(essay, /<html lang="en" data-mode="paper">/);
    assert.match(essay, /data-writing-mode-toggle/);
    assert.match(essay, /FIELD NOTES/);
    assert.match(essay, /writing\.css\?v=20261026-field-notes/);
  }
  for (const token of ["var(--paper)", "var(--ink)", "var(--accent)", "var(--line-strong)"]) {
    assert.ok(writingCss.includes(token), `writing stylesheet should use ${token}`);
  }
  assert.ok(!writingCss.match(/var\(--(?:bg|red|red-soft|surface-2|text)\)/));
  for (const phrase of ["portfolio-mode", "data-writing-mode-toggle", "reading-progress", "localStorage"]) {
    assert.ok(writingScript.includes(phrase), `writing interaction should include: ${phrase}`);
  }
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
    "CPU first local face authentication for Linux",
    "Cross-lingual speech emotion recognition",
    "I build robotics software and"
  ]) assert.ok(html.includes(phrase), `missing: ${phrase}`);
  assert.ok(!html.toLowerCase().includes(["car", "roll"].join("")));
});

test("field manual presents concrete project and experience evidence", () => {
  for (const phrase of [
    "30</strong> disturbance runs / 0 hits",
    "23.09 ms</strong> cam to meas p95",
    "61</strong> passing CI tests",
    "12.6 ms</strong> embedding p95",
    "13</strong> corpus splits",
    "network with 200 nodes",
    "92% obstacle avoidance in real tests",
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

test("homepage uses the Nocturne Obsidian Grid palette instead of YC orange", () => {
  for (const color of ["#07090a", "#0b0f10", "#1b2925", "#a7b8b1", "#6d9578", "#9a895c", "#9b5b5b"]) {
    assert.ok(css.includes(color), `missing Nocturne color: ${color}`);
  }
  assert.ok(!css.includes("#d94e1f"));
  assert.ok(!css.includes("#ff6b35"));
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
