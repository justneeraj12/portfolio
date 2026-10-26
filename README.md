# Neeraj Kanchani — Robotics Portfolio

A recruiter-focused robotics portfolio with the NOC / Nocturne Obsidian Grid language: near-black surfaces, sage-green signal color, compact type, and control-system details.

## Local development

Requirements: Node.js 20+ and Python 3.

```bash
npm test
npm run serve
```

Open `http://localhost:4173`. The deployable site lives in `site/`; tests and deployment configuration stay outside the published artifact.

## Content maintenance

- Primary content: `site/index.html`
- Design tokens and responsive layout: `site/styles.css`
- Essays: `site/writing/*/index.html` (source copies in `docs/writing/`)
- Reading styles: `site/writing.css`
- Small progressive enhancements: `site/script.js`
- Résumé source and published PDF: `resume/neeraj-kanchani-resume.tex` and `site/neeraj-kanchani-resume.pdf`
- Search/social metadata: `<head>` in `site/index.html`, `site/robots.txt`, and `site/sitemap.xml`

The site uses no web fonts, analytics, trackers, or frameworks. The essay loads public GitHub comments and reaction totals when the discussion section approaches the viewport; it needs no API key. JavaScript powers the role-fit console as progressive enhancement; the core content remains usable without it.

## Fastest free publishing

Run `npm run package`, then drag `neeraj-portfolio-upload.zip` into a new Cloudflare Pages Direct Upload project. This produces a free `pages.dev` URL without build settings or framework configuration.

For automatic publishing from GitHub, the included workflow deploys `site/` to GitHub Pages after each push to `main`.

## Deployment

Live site: https://justneeraj12.github.io/portfolio/

Essay: https://justneeraj12.github.io/portfolio/writing/the-one-centimeter-advantage/

Bengaluru essay: https://justneeraj12.github.io/portfolio/writing/before-bengaluru-gets-bigger/

The essay is static HTML and remains readable with JavaScript disabled. No account, analytics, or subscription is required. Metadata uses the active GitHub Pages URL; update it when a custom domain is connected.

The GitHub Actions workflow verifies the site and publishes `site/` to GitHub Pages after each push to `main`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for first publish and the verified sequence for connecting `justneeraj.tech`.

## Evidence policy

Project descriptions are based on the public `justneeraj12` repositories. Status qualifiers such as “simulation,” “developer beta,” and “foundation / data audit” are intentional and should be updated only when the linked repositories support a stronger claim.

## License

The implementation is MIT licensed. Personal copy, identity, and project descriptions remain attributable to Neeraj Kanchani.

## Essay discussion and sharing

Comments and reactions use one GitHub issue per essay: [issue #1](https://github.com/justneeraj12/portfolio/issues/1) for the trades essay and [issue #2](https://github.com/justneeraj12/portfolio/issues/2) for the Bengaluru essay. Visitors read the articles without signing in; commenting and reacting open GitHub and require a GitHub account. The page displays the latest page of up to 30 comments, omits minimized comments, and retains direct links if the public API is unavailable or rate-limited. No visitor credentials are stored.

Native sharing is used where supported, with a copy-link fallback. `site/writing.js` handles sharing; `site/writing-comments.js` handles discussion display.
