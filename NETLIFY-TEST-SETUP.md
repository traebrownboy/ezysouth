# EzySouth + JobFlow: separate Netlify test website

**Status:** GitHub branch `jobflow-netlify-test` is deployment-ready; Netlify site must still be imported/created in your Netlify account. Do not claim the Netlify site exists until it has its own real URL and a successful deploy.

## iPhone setup (do this in the existing Netlify account)

1. Open **https://app.netlify.com/** in Safari. Stay signed in to the Netlify account that hosts the working EzySouth site.
2. From **Projects**, select **Add new project** → **Import an existing project** → **GitHub**.
3. Choose the EXISTING repository **`traebrownboy/ezysouth`**. You can use the same repository for two Netlify projects.
4. Set the new project's **branch to deploy** to **`jobflow-netlify-test`** (not `main`).
5. Build settings should be taken from the committed **root `netlify.toml`** on this branch. Verify:
   - **Base directory:** empty (repo root)
   - **Build command:** empty / none
   - **Publish directory:** **`netlify-preview`**
   - Do **not** run `node scripts/build-production.js` or publish `dist`, as those are production settings from main.
6. Give this **NEW** site a distinctive testing name if Netlify offers one, such as `ezysouth-jobflow-lab` (if available; Netlify assigns the actual URL). Never rename the existing `ezysouth.netlify.app` site or change its production branch.
7. Deploy the new project. Wait for a successful deploy in the Netlify dashboard. Copy the **ACTUAL** `https://....netlify.app` URL; do not guess it.
8. Open the new site's root address. It should say **STAGING ONLY** and show EzySouth Web Builder. Select **JobFlow ↗**: it should open **`https://<actual-site>.netlify.app/jobflow.html`**, also labeled STAGING ONLY.
9. In the separate **staging Supabase** project, open **Authentication → URL Configuration → Redirect URLs** and allow the exact `https://<actual-site>.netlify.app/jobflow.html` and `https://<actual-site>.netlify.app/index.html` URLs for confirmation emails. This setting cannot be changed via the current Supabase ChatGPT connector. Do not change production Supabase Auth settings.
10. Use a test email and **new, unique password**. **Never enter real customer details or use a production account.** Create a fake JobFlow business and fake website to test cloud saving.

## How to test the cross-product workflow

1. Visit `/jobflow.html`; create a fictional business and customer, then a manual job. Reload to test cloud persistence.
2. Visit `/` on the same new Netlify test domain, select **Cloud Account**, and log in using the same staging account.
3. Create a fictional business website and save it as a cloud project. In **Launch & Export**, enable live JobFlow enquiries for the fake website. Publishing to real sites is intentionally disabled.
4. Return to `/jobflow.html`, refresh enquiries, and select the fake website from the dropdown.
5. Tap **Simulate incoming website enquiry**. This invokes the JWT-authenticated staging `jobflow-demo-enquiry` Edge Function; the owner and website ID are verified, and the function inserts a completely fake enquiry. On the Netlify test domain the function accepts HTTPS `*.netlify.app` origins. No real websites receive test content.
6. Change the fake enquiry to **Completed**, select **Send to Website**, add a safe fake public title/description and confirm permission.
7. In the Web Builder, **open that same fake cloud website**. Tap **Refresh completed work** in Design Studio. The selected item should appear in its preview; **nothing publishes automatically**.
8. Confirm a different test account cannot see the first account's customers, enquiries, manual jobs or showcase data. The staging database has already passed a two-tenant rollback-only SQL RLS check, but browser testing is still required.

## Build isolation and safety

- **Git branch:** `jobflow-netlify-test`, based on `feature/jobflow-staging-safety`. Not merged into `main`.
- **Build/publish config:** `netlify.toml` sets `publish = "netlify-preview"` and no build command.
- **Netlify deploy folder:** `netlify-preview/` contains only `index.html`, `jobflow.html`, `_headers` and `robots.txt`. The database SQL and development docs are *outside* the publish folder.
- **Data:** both pages use the existing free STAGING Supabase project `anldjuaqlpowwodlphqf`, with a public/publishable client key. No production Supabase URL/key, secret key, or service-role token is in the website.
- **Security:** RLS on all staging tables; staging RLS tests passed. Netlify pages use noindex, no-store, X-Frame-Options and nosniff headers.
- **Publishing controls:** live publishing, unpublishing, removing hosted sites and direct Netlify deployments from within the Builder remain intentionally disabled for these test pages.
- **Original production site:** `https://ezysouth.netlify.app/` keeps its existing Netlify project and `main` branch. No modifications to `main` were required.
- **No Netlify site created automatically:** the ChatGPT environment can update GitHub and Supabase but currently has **no connected Netlify action** to create the second Netlify project. User must import the repository once in Netlify.

## Checklist if something fails

- **It shows the original site instead of STAGING ONLY:** Stop. New Netlify project's branch/publish settings are wrong. Correct branch to `jobflow-netlify-test` and publish dir `netlify-preview`; do not edit the existing production site.
- **The JobFlow link gives 404:** Confirm `netlify-preview/jobflow.html` is in the successful deployment, not `dist`.
- **You can't verify the staging login:** Allow your actual test site's exact URLs under staging Supabase Auth redirect configuration; check the email verification link. Confirm the app is pointing at `anldjuaqlpowwodlphqf.supabase.co`.
- **Fake enquiry button reports CORS/network error:** Confirm staging demo Edge Function v2+ and Netlify HTTPS origin. It accepts `*.netlify.app` origins but still requires a JWT and website ownership.
- **A cloud website doesn't appear in JobFlow:** Open/save the fake cloud site while logged into the same staging user account and refresh JobFlow.
- **No previews after choosing Completed:** Check the operator saved the handoff, opened the *same* website in the builder and refreshed approved work.
