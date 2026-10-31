"""Render the published article from docs/writing/the-white-collar-mirage.md.

Requires Python-Markdown and BeautifulSoup. Run from the repository root with:
    python3 scripts/render-white-collar-mirage.py
"""

from collections import Counter
from pathlib import Path
from urllib.parse import quote
import html
import json
import math
import re

import markdown
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/writing/the-white-collar-mirage.md"
OUTPUT = ROOT / "site/writing/the-white-collar-mirage/index.html"
URL = "https://justneeraj12.github.io/portfolio/writing/the-white-collar-mirage/"
IMAGE = f"{URL}white-collar-mirage-social.png"
DESCRIPTION = (
    "Why ₹8 lakh in guaranteed cash should be ordinary for Bengaluru's junior tech "
    "workers, and how fair pay can move through a city and a country."
)
DATE = "2026-10-30"
ISSUE = 3


rendered = markdown.markdown(SOURCE.read_text(), extensions=["toc", "tables"])
soup = BeautifulSoup(rendered, "html.parser")
title = soup.h1.get_text(" ", strip=True)
soup.h1.decompose()
subtitle_node = soup.find("p")
subtitle = subtitle_node.get_text(" ", strip=True)
subtitle_node.decompose()

headings = [h for h in soup.find_all("h2", id=True) if h["id"] != "notes-methodology"]
toc = "".join(
    f'<li><a href="#{h["id"]}">{html.escape(h.get_text(" ", strip=True))}</a></li>'
    for h in headings
)

notes_heading = soup.find("h2", id="notes-methodology")
assert notes_heading, "Notes heading missing"
notes = soup.new_tag("section", attrs={"class": "essay-notes"})
for node in list(notes_heading.next_siblings):
    notes.append(node.extract())
notes.insert(0, notes_heading.extract())
soup.append(notes)

body_text = soup.get_text(" ", strip=True)
words = len(re.findall(r"\b[\w]+(?:['’\-][\w]+)*\b", f"{title} {subtitle} {body_text}"))
minutes = math.ceil(words / 220)
article_html = str(soup)

schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": DESCRIPTION,
    "author": {"@type": "Person", "name": "Neeraj Kanchani", "url": "https://justneeraj12.github.io/portfolio/"},
    "url": URL,
    "mainEntityOfPage": URL,
    "image": IMAGE,
    "datePublished": DATE,
    "dateModified": DATE,
    "inLanguage": "en",
}
esc = lambda value: html.escape(value, quote=True)
mail_body = quote(URL, safe="")
mail_subject = quote(title, safe="")

page = f'''<!doctype html>
<html lang="en" data-mode="paper"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)} | Neeraj Kanchani</title>
<meta name="description" content="{esc(DESCRIPTION)}">
<meta name="author" content="Neeraj Kanchani"><meta name="theme-color" content="#edf0eb"><meta name="color-scheme" content="light dark">
<meta name="robots" content="index,follow,max-image-preview:large"><meta name="referrer" content="strict-origin-when-cross-origin">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' https://fonts.googleapis.com; script-src 'self'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.github.com; object-src 'none'; base-uri 'self'; form-action 'self'">
<link rel="canonical" href="{URL}"><link rel="icon" href="../../favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&amp;family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;500;600&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../styles.css?v=20261026-noc-palette"><link rel="stylesheet" href="../../writing.css?v=20261026-field-notes">
<link rel="stylesheet" href="assets/global-wage-ripple.css?v=20261030"><link rel="stylesheet" href="assets/mirage.css?v=20261030">
<meta property="og:type" content="article"><meta property="og:site_name" content="Neeraj Kanchani">
<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(DESCRIPTION)}">
<meta property="og:url" content="{URL}"><meta property="og:image" content="{IMAGE}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(title)}, an essay by Neeraj Kanchani">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
<script src="../../writing.js" defer></script><script src="../../writing-comments.js" defer></script>
<script src="assets/d3.v7.9.0.min.js" defer></script><script src="assets/global-wage-ripple.js" defer></script>
</head><body class="essay-page">
<a class="skip-link" href="#essay">Skip to essay</a>
<div class="status-line" aria-hidden="true"><span>SYS.NOMINAL // WRITING</span><span>WORK · WAGES · CITIES</span><span>NOTE 03</span></div>
<header class="reading-nav"><a href="../../" class="brand"><span class="brand-mark">NK</span><span>FIELD NOTES</span></a><div class="reading-controls"><a href="../../#writing">[ PORTFOLIO ]</a><button type="button" data-writing-mode-toggle aria-pressed="false">[ SWITCH TO NOCTURNE ]</button></div></header>
<main id="main"><header class="essay-header"><p class="section-code"><span>03</span> FIELD NOTES / WORK &amp; CITIES</p>
<h1>{esc(title)}</h1><p class="essay-subtitle">{esc(subtitle)}</p>
<div class="essay-byline"><span>By Neeraj Kanchani</span><time datetime="{DATE}">30 October 2026</time><span>{minutes} min read</span></div>
<nav class="essay-quicklinks" aria-label="Essay actions"><a href="#global-scenario">GLOBAL SCENARIO</a><a href="#comments">COMMENTS</a><a href="#share">SHARE</a><a href="#notes-methodology">NOTES &amp; SOURCES</a></nav></header>
<div class="reading-layout"><aside class="essay-contents"><details><summary>WHAT IS IN THIS ESSAY</summary><ol>{toc}</ol></details></aside>
<article class="essay-body" id="essay" aria-label="{esc(title)}">{article_html}</article></div>
<section id="share" class="essay-share" aria-labelledby="share-title"><h2 id="share-title">Share it if it made you think.</h2>
<p>Know someone who works in Indian tech, hires for it, or thinks about the city around it?</p>
<div class="share-actions"><button type="button" data-share hidden>Share ↗</button><button type="button" data-copy-link hidden>Copy link</button><a href="mailto:?subject={mail_subject}&amp;body={mail_body}">Email a friend</a></div>
<p data-share-status role="status" aria-live="polite"></p><div data-share-fallback hidden><label for="article-link">Article link</label><input id="article-link" type="url" readonly value="{URL}"></div></section>
<section id="comments" class="essay-comments" data-discussion data-repo="justneeraj12/portfolio" data-issue="{ISSUE}" aria-labelledby="comments-title">
<p class="section-code"><span>DISCUSSION</span> YOUR TURN</p><h2 id="comments-title">Comments &amp; reactions</h2>
<p>Know these contracts or see a weak point in the argument? Tell me what I missed.</p><p class="discussion-counts" data-comment-counts></p>
<p data-comments-status role="status" aria-live="polite">Read the conversation or leave a comment on GitHub.</p><ul class="comment-list" data-comments-list></ul>
<div class="share-actions"><a href="https://github.com/justneeraj12/portfolio/issues/{ISSUE}" target="_blank" rel="noopener noreferrer">Comment on GitHub ↗</a><a href="https://github.com/justneeraj12/portfolio/issues/{ISSUE}" target="_blank" rel="noopener noreferrer">Like / react on GitHub ↗</a><button type="button" data-comments-refresh hidden>Refresh comments</button></div>
<p class="discussion-note">GitHub sign-in is needed to comment or react. Reading stays open to everyone. Reactions are added to the opening post on GitHub.</p></section>
<div class="essay-end"><span>END OF NOTE / 03</span><p>Think I missed something?</p><a href="mailto:neeraj.2xx4@gmail.com?subject={mail_subject}">Send me a note</a><a href="../../#writing">Back to the portfolio</a></div>
<aside class="essay-related" aria-labelledby="related-essay-title"><span>NOTES 01 &amp; 02 / PEOPLE AND PLACE</span><h2 id="related-essay-title"><a href="../the-one-centimeter-advantage/">The One-Centimeter Advantage</a></h2><p>For the worker outside the office, start with skill and respect. Then read <a href="../before-bengaluru-gets-bigger/">Before Bengaluru Gets Any Bigger</a> for the city that has to keep up.</p></aside>
</main><footer class="site-footer"><p>Neeraj Kanchani · 2026</p><nav aria-label="Footer"><a href="../../">Portfolio</a><a href="#main">Back to top</a></nav><p>Field note / 03</p></footer>
</body></html>
'''

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(page)
check = BeautifulSoup(page, "html.parser")
ids = [tag["id"] for tag in check.find_all(id=True)]
assert len(ids) == len(set(ids)), "Duplicate IDs"
for link in check.find_all("a", href=True):
    if link["href"].startswith("#"):
        assert link["href"][1:] in ids, f"Broken anchor: {link['href']}"
assert len(check.select("article figure")) == 6, "Expected six figures"
refs = Counter(a["href"] for a in check.select('sup a[href^="#note-"]'))
assert len(refs) == 11 and all(href[1:] in ids for href in refs), "Missing note"
print(f"Generated {OUTPUT.relative_to(ROOT)}: {words} words, {minutes} min read, {len(refs)} linked notes, 6 figures.")
