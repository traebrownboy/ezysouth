# Ezysouth safe V7 development preview

This branch is isolated from the production `main` branch. It is for testing, not customer use.

## Cloudflare Pages setup (one-time owner action)

1. In [Cloudflare Workers & Pages](https://dash.cloudflare.com/), create a new **Pages** project using the GitHub repository `traebrownboy/ezysouth`.
2. Select **development/preview** as the production branch for this separate Cloudflare project. Do **not** use `main`.
3. Framework preset: **None**.
4. Build command: `node scripts/build-preview.js`
5. Build output directory: `preview-dist`
6. Deploy the Cloudflare project. It will receive a separate `*.pages.dev` URL (not your Netlify production domain).

Updates to `development/preview` can then rebuild the separate demo preview automatically. Check Cloudflare's branch controls and free-tier usage settings.

## Safety rules

- `scripts/build-preview.js` first builds the real V7 source to `dist/` then writes a separate, isolated `preview-dist/index.html` file.
- The preview removes the production Supabase SDK and API reference, blocks outgoing fetch calls and hides live cloud/publishing actions.
- Use fictional customers and jobs only. Browser-local data is temporary and may be cleared.
- Never add customer secrets, live API tokens or private data to the preview.
- Keep Netlify production untouched. Do not merge into `main` or enable Netlify branch deploys without the owner's explicit approval.
- The full V7 cloud workflow is **not** testable in isolated demo mode. Separate staging backend and credentials will be necessary to validate real logins, forms, and publication later.

## Local build

```bash
node scripts/build-preview.js
# Open preview-dist/index.html using a development web server.
```

## Pending

The preview-host connection needs to be configured in the Cloudflare account. Code pushed to this branch does **not** mean a Cloudflare preview URL already exists.