# Neeraj Kanchani — Portfolio

A fast, dependency-free personal portfolio with the NOC / Nocturne visual language: near-black surfaces, restrained red signal color, compact type, and terminal-inspired interactions.

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
- Small progressive enhancements: `site/script.js`
- Search/social metadata: `<head>` in `site/index.html`, `site/robots.txt`, and `site/sitemap.xml`

The site uses no web fonts, analytics, trackers, frameworks, or runtime APIs. JavaScript is progressive enhancement; the content and navigation remain usable without it.

## Deployment

The GitHub Actions workflow verifies the site and publishes `site/` to GitHub Pages after each push to `main`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for first publish and the verified sequence for connecting `justneeraj.tech`.

## Evidence policy

Project descriptions are based on the public `justneeraj12` repositories. Status qualifiers such as “simulation,” “developer beta,” and “foundation / data audit” are intentional and should be updated only when the linked repositories support a stronger claim.

## License

The implementation is MIT licensed. Personal copy, identity, and project descriptions remain attributable to Neeraj Kanchani.
