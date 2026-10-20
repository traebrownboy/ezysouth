# JobFlow scheduling and job deletion — staging beta

Deployment: `jobflow-netlify-test` branch, `netlify-preview/jobflow-schedule.html`. The main production site and production Supabase database are unchanged.

## Workflow

1. Accepted quotes create exactly one entry in **jobflow_jobs**, status **Unscheduled**, with the original quote ID and customer details. Already accepted staging quotes are backfilled.
2. The business can use **Schedule job** on an accepted quote, or **Open Job Schedule** from JobFlow. Both open the same existing Jobs data.
3. The schedule has **Week, Month, Day, All jobs, Completed, Archived, and Trash** views. Jobs can be created manually with or without a business workspace.
4. Job details support NZ-local date/time (including daylight-saving handling), duration, an assignee name, site address, notes, and status. An overlapping job for the same assigned name (or unassigned jobs) triggers a confirm dialog before saving.
5. The schedule refreshes periodically while visible. It does not email or text customers automatically. Assignees are names, not accounts with separate staff access.
6. Work photos are kept in the new **private** `jobflow-work-photos` Supabase Storage bucket. Photos are owner/job-scoped, limited to six JPEG uploads after browser compression (3 MB per image), and shown with temporary signed URLs. They are **not published** to the user's website.
7. **Archive** removes old work from the active calendar but retains the job. **Trash** hides a job while leaving it recoverable. **Restore** brings it back; **Delete permanently** requires a deliberate `DELETE` confirmation and removes its private photos first. Row-level security in Postgres prevents normal authenticated API callers from directly deleting active jobs before moving them to Trash. Deleting the job never removes quote/invoice records.

## Security

- All new writes and tables are in the isolated staging Supabase project.
- Job RLS selects/updates/inserts are tied to the signed-in owner. A database trigger verifies that any linked quote, business and customer belong to that owner.
- Cross-account photo paths are rejected at the database boundary. Storage policies require the authenticated owner and an existing owned job.
- Customer acceptance is handled by a separate secure quote-approval function, with idempotent job creation.
- There is no staff-role authorization or automated assignment notification in this version.

## Checks performed

- Database: simulated accepted quote -> exactly one unscheduled job; manual create -> schedule -> in progress -> completed -> Archive -> Trash -> Restore -> permanent Delete. Both transactional checks rolled back.
- Database: customer acceptance RPC creates an invoice draft and one owned unscheduled job, and duplicate acceptance does not duplicate jobs.
- Database: direct deletion of active jobs is rejected, Trash deletion allowed, linked quotes preserved after job deletion, cross-owner photo path rejected.
- Time conversion: NZ daylight-saving and standard time, week-start calculation, and nonexistent DST time error handled.
- Static frontend checks: no duplicate IDs, all literal element references present, JS syntax valid, Netlify publishes the correct `netlify-preview` folder.

**Still to verify manually:** actual Netlify deployment, mobile end-to-end click tests, private photo upload/signed URL/delete, and scheduling from a real accepted test quote. Use fictional customer data only.
