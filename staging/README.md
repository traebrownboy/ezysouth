# JobFlow staging: isolated, fail-closed deployment

**State (2026-10-18):** staging front-end prepared in GitHub; Supabase branch has **NOT** been created or billed; staging frontend has **NOT** been hosted. All Supabase references point to `staging-not-configured.invalid` until a fresh branch is approved. Production does not read these files.

## What you can safely test now
The existing fictional-data V4 simulator remains available at:
https://raw.githack.com/traebrownboy/ezysouth/jobflow-v4-tester/tester/v4/index.html

That proxy is a *third-party, PUBLIC* preview service. **Do not enter real business/customer details, and never sign into Supabase through raw.githack.com.**

## Activate the real staging system (requires approval)
1. Get user approval for the quoted Supabase branch cost. Supabase quoted **US$0.01344 per hour**, usage charges may be additional. A running branch accrues charges until it is deleted. Delete it promptly after testing.
2. Create a Supabase branch named `jobflow-integration-staging` from project `ezcmfbaoivdwkgayznbt`. Branch data must stay empty/synthetic; never import production customer records.
3. Verify the branch contains the production baseline tables `websites`, `enquiries`, `builder_state`, etc. Branches created from migration history might not contain objects previously created without tracked migrations. If missing, repair the branch **only**, never main production.
4. Apply the SQL schema in `database/migrations/20261018_jobflow_showcases.sql` **to the staging branch only**. It adds four RLS-protected tables: JobFlow businesses, customers, jobs and approved showcase projects.
5. Fetch the branch's *publishable* public key (`sb_publishable_...`) and project URL. Update **both** `staging/index.html` and `staging/jobflow.html` by replacing:
   - `https://staging-not-configured.invalid` with the branch URL
   - `staging-publishable-key-not-configured` with the **branch publishable key only**
   - Never insert a secret key, `service_role`, token, private password or production key.
6. Set up a **new, separate Netlify site** using GitHub repo `traebrownboy/ezysouth`, branch `feature/jobflow-staging-safety`, and **publish directory `staging`**, with no custom production domain. Do not point the existing `ezysouth.netlify.app` site at this branch. The `_headers` file sets noindex/no-store response headers.
7. In the staging branch's Supabase Auth URL configuration, set the new staging Netlify URL as the Site URL and add `https://<your-staging-site>.netlify.app/**` as an allowed redirect. Do not use the production site for test email confirmations.
8. Use **two new fake staging email accounts** in two separate private browser sessions. Verify sign-up/login on `/jobflow.html` and `/index.html`.
9. Run `database/tests/jobflow_staging_rls.sql` only against the staging branch database. It wraps fabricated auth accounts and rows in a transaction and rolls all data back. A `FAIL:` SQL exception indicates a failing security test. Inspect failed assertions before changing any policy.
10. Run the test matrix below. Use synthetic name/contact records only. The branch's existing public `submit-enquiry` function should be verified using a synthetic EzySouth website; if the function is missing or secrets not set, do not silently fall back to the production endpoint.

## Test matrix
- A new JobFlow business saves without any website.
- Create a private customer and linked job, change the job to Completed, reload to verify saving.
- Owner A owns Website A, Owner B owns Website B. Neither sees the other person's private enquiries/customers/jobs or approved showcase entries.
- A public staging form submits a fake enquiry (using the staging project's `submit-enquiry` Edge Function only); it appears in A's JobFlow inbox. Website B sees none of A's data.
- Set enquiry status to **Completed**. Before completion, **Send to Website** must not be offered and database RLS rejects it even if bypassing the UI.
- Approve a new public **title and description**; customer name/contact/original message must not appear in `jobflow_showcases` or static exports.
- Open Website A in EzySouth Web, refresh and see only A's completed/approved showcase description, review before publication.
- Publishing, unpublishing, removing a live site and manual Netlify deployment are **deliberately disabled in staging**. Test the resulting exported HTML locally only; do not publish staging-generated sites through production Netlify.
- Remove featured draft; verify it disappears on refresh. Changing the underlying enquiry away from Completed also removes it from the builder preview.
- Security advisor for staging reports no new public RLS exposure.

## Stop conditions
Do not deploy the live feature branch to production until all of the above passes. If a test fails, preserve live service unchanged. A real customer beta transition additionally needs a controlled migration/release plan and rollback, and clean separation between test and production credentials.

## Static-copy safety
- `staging/index.html` is a copy of the candidate EzySouth Web Builder with one-click publishing, unpublishing and direct Netlify deployment disabled. The source still contains dormant handlers; these intentionally return before any network write.
- `staging/jobflow.html` is the candidate authenticated JobFlow UI with a fail-closed endpoint placeholder.
- Both staging pages send email confirmation users back to the staging URL, provided the Supabase Auth redirect allowlist includes it.
- Do not load the staging files on the existing production hostname: browser localStorage and authentication sessions are scoped to the origin. A dedicated Netlify staging domain is required.

## Cost control
Once staging QA is complete, **delete the Supabase branch** and retire the staging Netlify site to stop additional charges. No recurring monitoring or automatic teardown has been created; the operator must perform the deletion.
