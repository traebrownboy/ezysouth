# Cloudflare Pages playground for Ezysouth JobFlow Test

This deploys the **existing JobFlow Test staging app** from the separate GitHub development branch. It does NOT publish or change either Netlify project and does NOT use the main Ezysouth production Supabase database.

## First-time Cloudflare account setup (owner must do this)

1. Open https://dash.cloudflare.com/ and sign in or create a free Cloudflare account.
2. Open **Workers & Pages**, choose **Create application**, select **Pages**, then **Import an existing Git repository** (or the equivalent Git integration screen).
3. Authorise Cloudflare's GitHub connection for the repository **traebrownboy/ezysouth**.
4. Name the *separate Cloudflare project* something like `ezysouth-jobflow-playground`. The project name must be available; Cloudflare assigns the actual `*.pages.dev` URL.
5. Set **Production branch for this CLOUDFLARE PROJECT ONLY** to `development/jobflow-test-preview` (NOT `main`, NOT `jobflow-netlify-test`). This merely means the default `pages.dev` URL is our playground; it is not the customer-facing Netlify production site.
6. Set **Framework preset** to `None` and these exact build settings:

| Cloudflare setting | Value |
| --- | --- |
| Repository | `traebrownboy/ezysouth` |
| Production branch (Cloudflare only) | `development/jobflow-test-preview` |
| Root directory | repository root, default |
| Build command | `node scripts/cloudflare-preview-build.js` |
| Build output directory | `netlify-preview` |
| Environment variables | No new secrets needed for static build |

7. If Branch control allows restrictions, **disable deployments of other branches** for this Cloudflare project (set preview branches to None). Only the Cloudflare project's selected development branch should auto-deploy.
8. Deploy and copy the **actual** assigned `https://<project>.pages.dev/` URL. Test `/login.html`, `/web.html`, `/jobflow.html`, `/jobflow-schedule.html` and `/jobflow-documents.html`.

The build guard aborts if Cloudflare's `CF_PAGES_BRANCH` is anything other than `development/jobflow-test-preview`. It also runs the staging release preflight so accidental production URLs, missing files or missing anti-indexing headers fail before deployment.

## Important sign-in and data notes

- Cloudflare's URL is **publicly accessible by default**. Noindex headers do not make a site private. Use only fake customers, fictional job info and throwaway test credentials. Configure Cloudflare Access separately if you require access restrictions.
- This preview intentionally uses the **existing staging Supabase** project `anldjuaqlpowwodlphqf`; therefore **Cloudflare and the current JobFlow Test Netlify site share the same TEST database** and staging logins. Do not assume they are isolated from each other.
- Some authentication emails may not redirect back to the new `pages.dev` host until you add that actual host to the **staging Supabase** Auth URL allowlist (Authentication > URL Configuration > Redirect URLs). Do not modify production Supabase. Allow the exact staging URLs such as `https://YOUR-ACTUAL-PAGES-DEV-ADDRESS/login.html` and any required confirmation/recovery variations. Do not use a wildcard until necessary, and check real email flows.
- Some share links or staging publishing functions may still point back to the existing Netlify staging URL. We need to test any cross-origin/CORS behaviour and make host-independent changes on this dev branch if needed. Do not tell a tester those features work until checked.
- Do not change, merge or publish either Netlify deployment branch without explicit owner approval.
- Cloudflare Pages has its own free-tier limits. Check the account's current plan and settings; the user should not need a paid plan to serve a basic static test site.

## Check before expecting a live URL

Creating this file and running GitHub Actions **does not** create a Cloudflare project. The owner must connect Cloudflare to GitHub using their own Cloudflare account first.

## Links

- Existing NETLIFY JobFlow Test: https://ezysouth-jobflow-test.netlify.app/
- Production Ezysouth (do not touch): https://ezysouth.netlify.app/
- Code to deploy: https://github.com/traebrownboy/ezysouth/tree/development/jobflow-test-preview
- Cloudflare docs: https://developers.cloudflare.com/pages/get-started/git-integration/
