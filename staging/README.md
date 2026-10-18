# EzySouth / JobFlow free staging (18 October 2026)

## LIVE STAGING URLS

- **JobFlow staging (first-party Supabase):** https://anldjuaqlpowwodlphqf.supabase.co/functions/v1/jobflow-staging
- **EzySouth Web staging (first-party Supabase):** https://anldjuaqlpowwodlphqf.supabase.co/functions/v1/ezysouth-staging

These are **publicly reachable staging login pages**, not production customer websites. The Supabase connector reports both Edge Functions as ACTIVE, but an independent real-device/browser smoke test of the links is still required.

### Database

Uses a previously empty existing Supabase project: `anldjuaqlpowwodlphqf`. Its free project slot was already occupied before this work. **No additional project or paid database branch created.** All synthetic test users and test enquiry data were rolled back by the security test.

Proposed tables were applied only to that staging project:
- `websites`, `enquiries`, `builder_state`, `website_deployments`, `enquiry_rate_limits` (matching the minimum production baseline)
- `jobflow_businesses`, `jobflow_customers`, `jobflow_jobs`, `jobflow_showcases` (the new secure JobFlow schema)

Security: Every public table has RLS enabled. The `jobflow-demo-enquiry` Edge Function requires a signed-in staging user JWT and enforces per-website ownership and rate limiting. Live owner-isolation test in `database/tests/jobflow_staging_rls.sql` **PASSED** on the staging Supabase project. A pre-existing public EXECUTE permission on `public.rls_auto_enable()` was also revoked in staging following a security advisor warning. Remaining two advisor INFO findings are intended no-policy service-only tables.

### How to test (fictional details only)

1. Open the **JobFlow staging link** on your iPhone. Sign up with an email you control and a unique test password. Do **not** use a production customer password.
2. Supabase may require email verification. If the confirmation redirect goes to the wrong URL, add these two exact URLs in the **staging Supabase** dashboard under **Authentication > URL Configuration > Redirect URLs**:
   - `https://anldjuaqlpowwodlphqf.supabase.co/functions/v1/jobflow-staging`
   - `https://anldjuaqlpowwodlphqf.supabase.co/functions/v1/ezysouth-staging`
   This setting cannot currently be changed through the available connector.
3. Sign in and create a fictional JobFlow business, customer and manual job. Refresh the browser: data should persist in the staging cloud database.
4. Tap **EzySouth Web Builder**, sign in using the **same staging account**, create a fake website and **Save to Cloud**. The user may need to open it from the Cloud tab if newly created.
5. Return to JobFlow, tap **Refresh enquiries**. The connected fake website should appear. Enquiries from real published websites are **not** imported.
6. In the **JobFlow staging** inbox, select your fake website and press **＋ Simulate incoming website enquiry**. This calls the **JWT-protected `jobflow-demo-enquiry` Edge Function**, which validates website ownership, checks that enquiries are enabled and generates synthetic names/contact/message only (limit five per site per hour). Mark the enquiry Completed; **Send to Website** appears only then.
7. Approve a public title and summary, then open the fake website in Web Builder and refresh Completed Work. Verify the summary appears, with no private name/contact/message.

**Caution:** Publishing, unpublishing, removal, and direct Netlify deployments remain deliberately disabled in staged Website Builder. There is no path from staging to the live EzySouth project.

### Security/quality checks already performed
- Supabase RLS transaction with synthetic owners, websites, enquiries, customers, jobs and showcase records: **PASSED**.
- SQL test checks two-tenant isolation, Completed-only handoff, cross-business foreign keys and anonymous restrictions; the test uses BEGIN/ROLLBACK to avoid leaving synthetic records.
- A staged security advisor scan detected and resolved public EXECUTE of `public.rls_auto_enable()`.
- All staged HTML JavaScript parsed, staging client configuration contains only the staging project's public publishable key; no production API URL or key, and no service-role secret, in the public pages.
- Both UI Edge Functions deploy as public **static HTML handlers** with no server database reads/writes and no secret exposure. The separate simulated enquiry Edge Function is JWT-protected and performs strictly synthetic inserts after verifying ownership. The private data API remains behind Auth and RLS.
- Earlier V4 fictional-only DOM tester: https://raw.githack.com/traebrownboy/ezysouth/jobflow-v4-tester/tester/v4/index.html

### Remaining steps
- User iPhone smoke test of both Edge Function URLs, signup, confirmation link, login, cross-navigation and save/reload.
- Full browser-to-Supabase integrated test with two separate authorised fictional users.
- Simulated incoming website enquiry tool is now deployed; user should exercise it on iPhone. Public unauthenticated website form submission remains to be tested later on a separate fake published site.
- Check the separate free GitHub Actions PostgreSQL test at https://github.com/traebrownboy/ezysouth/actions; it was committed but connector cannot currently confirm a push-triggered run result.
- No real customer beta release until final staging acceptance and controlled production migration.

### Project isolation
- **Production Supabase:** `ezcmfbaoivdwkgayznbt`; existing EzySouth main site `https://ezysouth.netlify.app` **untouched**.
- **Free staging Supabase:** `anldjuaqlpowwodlphqf`; contains only new staging tables and any test records a user deliberately creates.
- **Feature code:** `feature/jobflow-staging-safety`; GitHub `main` unchanged.
