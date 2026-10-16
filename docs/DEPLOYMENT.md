# Publishing and domain runbook

This repository is ready for GitHub Pages, but publishing is intentionally separate from DNS. Complete the steps in order and verify each state before changing the next one.

## 1. Create the destination repository

Create a new public repository under `justneeraj12` (for example, `portfolio`) without adding a README, license, or `.gitignore`. Then connect and push:

```bash
git remote add origin git@github.com:justneeraj12/portfolio.git
git push -u origin main
```

If HTTPS is preferred, use `https://github.com/justneeraj12/portfolio.git` as the remote. Do not repurpose the existing `developer-portfolio` fork without first deciding to replace it; it currently points to upstream project branding and is not configured for Pages.

## 2. Enable GitHub Pages

In the new repository:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions**.
3. Open the **Actions** tab and confirm the “Deploy to GitHub Pages” workflow passes.
4. Visit the `github.io` URL shown by the deployment before adding a custom domain.

The workflow deploys only `site/`, after running the repository tests. It does not need a `CNAME` file because Pages custom domains for Actions deployments are configured in repository settings.

## 3. Verify domain ownership first

GitHub recommends verifying a custom domain before assigning it to a Pages site. In GitHub, open **Settings → Pages** for the user account and follow **Add a domain** for `justneeraj.tech`. GitHub will provide a TXT record; add that exact value at the DNS provider and wait until GitHub reports the domain as verified.

Never copy a verification value from another account or invent one. Keep the TXT record after verification.

## 4. Add the custom domain in Pages

After ownership is verified and the `github.io` deployment works:

1. In the repository’s **Settings → Pages**, enter `justneeraj.tech` under **Custom domain** and save.
2. Wait for GitHub to accept the domain before changing DNS.
3. Record the exact default Pages hostname shown for the site (normally `justneeraj12.github.io`).

## 5. Inspect, then change DNS

Before editing DNS, capture the current state:

```bash
dig justneeraj.tech A +noall +answer
dig justneeraj.tech AAAA +noall +answer
dig www.justneeraj.tech CNAME +noall +answer
dig justneeraj.tech TXT +noall +answer
```

At the time this project was prepared (2026-10-16), read-only queries returned no A/AAAA records for the apex and no CNAME for `www`. Re-run the queries: DNS may have changed.

If the state is still empty and the GitHub Pages settings show the correct repository, configure the DNS provider using GitHub’s current documented values:

- Apex `@`: the four GitHub Pages A records shown in the current GitHub documentation.
- Optional IPv6: the four current GitHub Pages AAAA records.
- `www`: CNAME directly to `justneeraj12.github.io` (never to a repository path and never to the apex).

Do not create wildcard records. Do not delete unrelated TXT, MX, CAA, or verification records. Re-check the official GitHub Pages custom-domain documentation immediately before making changes because service addresses and UI can change.

## 6. Verify DNS and HTTPS

After DNS propagates:

```bash
dig justneeraj.tech A +noall +answer
dig www.justneeraj.tech CNAME +noall +answer
curl -I https://justneeraj.tech
curl -I https://www.justneeraj.tech
```

Confirm that the apex reaches this portfolio, `www` redirects as intended, and there are no certificate warnings. Then enable **Enforce HTTPS** in Pages. GitHub notes that DNS and certificate provisioning can take up to 24 hours.

## Rollback

If the new deployment is incorrect, first remove the custom domain from this repository’s Pages settings, then restore the exact DNS records captured before the change. Disabling Pages while DNS still points at GitHub can create takeover risk; keep repository settings and DNS aligned.

## Sources

- [Managing a custom domain for GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [Verifying your custom domain for GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
- [Deploying with custom GitHub Actions workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
