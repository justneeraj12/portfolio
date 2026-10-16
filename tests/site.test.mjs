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

test("page has one primary heading and all required sections", () => {
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  for (const id of ["top", "systems", "path", "research", "contact"]) {
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
    "Expected Dec 2026",
    "B.E. Artificial Intelligence &amp; Machine Learning",
    "NOC / Nocturne",
    "Vision Leader–Follower",
    "Face Unlock for Linux",
    "Cross-Lingual Speech Emotion Recognition",
    "Simulation project; no physical-hardware deployment claim",
    "Full model training and performance results are not yet complete"
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
});

test("site has no external runtime dependencies", () => {
  assert.ok(!html.match(/<script[^>]+src="https?:\/\//));
  assert.ok(!html.match(/<link[^>]+rel="stylesheet"[^>]+href="https?:\/\//));
  assert.ok(!css.match(/@import\s+url\(["']?https?:\/\//));
});
