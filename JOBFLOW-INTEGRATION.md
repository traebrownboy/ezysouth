# JobFlow live inbox + EzySouth Web handoff (development branch)

**Current status:** code complete for an initial integration path; **NOT deployed to production**, database migration **NOT applied**. No existing website URLs or submitted enquiries have been changed.

## What the linked version does
1. Existing public websites keep sending their real enquiry forms to the existing `submit-enquiry` Edge Function and `public.enquiries` table. There is no interruption or rewrite of the publishing service.
2. The separate `jobflow.html` app on the SAME EzySouth origin uses the existing Supabase Auth login and owner-only RLS. It loads enquiries across the signed-in owner's websites and lets them change statuses, including **Completed**.
3. It provides independently saved JobFlow business details, customers and manual jobs for users who do not have a website.
4. Only **Completed** enquiries expose the **Send to Website** action. An operator writes and explicitly approves a new **title and summary**. Original customer names, contact details, enquiry text and photos are never auto-transferred.
5. The secure `jobflow_showcases` table stores public descriptions linked to the originating enquiry and website, with RLS tied to website ownership and a completed-enquiry check on insert/update.
6. EzySouth Web's Design Studio fetches a website's approved completed projects, verifies the related enquiry still has **Completed** status, shows a **Completed projects** section in the website preview and includes it in exports. The one-click publisher refreshes the projects before building site HTML. The operator must review and publish deliberately. Sending does **not** publish a live site.
7. Old `JobFlow Enquiries` nav is replaced by a link to `jobflow.html`. The legacy HTML/code remains hidden for compatibility; remove it in a separately tested cleanup, not during this change.

## Files
- `jobflow.html`: separate real Supabase-authenticated JobFlow app (NOT the public RawGitHack tester).
- `index.html`: main builder navigation, showcase preview and publication integration.
- `database/migrations/20261018_jobflow_showcases.sql`: additive schema proposal for business, customers, jobs and approved handoff records.
- `tester/v4/index.html`: totally offline simulated workflow using fictional records only; deliberately cannot sign in, sync, send real enquiries or publish a website.

## Staging and release sequence
1. Review the SQL and deploy in a **separate Supabase staging instance**, checking schema, grants, RLS and an authenticated end-to-end flow. Do not expose real contacts on a third-party preview.
2. Deploy the feature branch to a first-party **staging Netlify site**. Do not deploy over `ezysouth.netlify.app` before verifying. Staging must use the staging database and publishable key, not production credentials or production customer records.
3. Test two users owning different businesses/websites: neither must see or edit the other's records; anonymous visitors must see no private tables; a non-completed enquiry must not be featureable; another website's enquiry must not be paired with the wrong website.
4. Verify business save; create/delete customer; create/update/delete job; completed website enquiry `Send to Website`; rejected missing permission; clear/reset draft; builder preview and static export; republish only after operator action.
5. Validate the existing customer website form and the existing one-click publish/unpublish actions still work; published URLs and site IDs stay the same.
6. After QA and permission, apply the additive migration to the correct production database using a controlled migration, then deploy the app and builder together. Confirm both parts work before inviting real beta users.
7. Roll back by restoring prior `index.html` and removing `jobflow.html` from the deployed site; **do not automatically drop tables/data**, as that would destroy newly entered records. Previously published sites stay at existing reserved URLs.

## Known first-release boundaries
- One independent JobFlow business per login. Multiple JobFlow businesses/team members can follow later.
- Website enquiries and manual jobs show in separate lists. Manual jobs are not yet eligible for automatic website featuring.
- Public work showcase is text-only; photos and permission-management workflow can follow.
- The tester only simulates web enquiries and publishing handoff; it does not provide a safe way to log in to production.
- Removing a featured work draft does **not** retroactively change already published static HTML. The operator must republish to update the live site.
- Publishing a new page from browser-only local data may lack externally approved work until the operator explicitly opens/syncs their cloud website; one-click publishing reloads approved work on each publish.
- This feature branch is **not an automatic production deployment**. The GitHub file URL is source, not a hosted service.

## Internal QA performed (not equivalent to browser/staging QA)
- JavaScript syntax checks for all main builder scripts and standalone JobFlow app.
- Offline V4 simulated DOM interactions: sample data, completed-only handoff, simulated incoming enquiry, preview privacy, removing featured draft and reset (9 checks).
- Supabase-mocked JobFlow UI interactions: owner website detection, real-shaped enquiry list, completed-only handoff, safe public fields, independent business/customer/job create (8 checks).
- Production and branch comparison to confirm changes are confined to the development branch.
