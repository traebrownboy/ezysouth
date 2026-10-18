# EzySouth + JobFlow: private beta staging guide

**Staging address:** https://ezysouth-jobflow-test.netlify.app/

- **Home / product selector:** https://ezysouth-jobflow-test.netlify.app/
- **EzySouth Web Builder:** https://ezysouth-jobflow-test.netlify.app/web.html
- **JobFlow:** https://ezysouth-jobflow-test.netlify.app/jobflow.html

This site is a **separate Netlify project** deploying GitHub branch `jobflow-netlify-test`. It uses isolated existing Supabase project `anldjuaqlpowwodlphqf` and intentionally **cannot publish customer websites**. Main/production branch, `https://ezysouth.netlify.app/`, and production Supabase project remain untouched. All customer/test data in staging should be fictional.

## Product navigation

The homepage offers two premium workspaces: **EzySouth Web** and **JobFlow by EzySouth**. Each workspace has a prominent **Return to homepage** link, plus a cross-product link. The website builder's primary tabs are Build website, Design Studio, Save & manage, and Connect JobFlow; legacy quick commands and local drafts are under **More tools**. Disabled publishing and direct Netlify-token controls are hidden from ordinary staging navigation.

## EzySouth → JobFlow → EzySouth acceptance test

1. Sign into JobFlow using your **staging** account and create a fictional business/customer.
2. Open EzySouth Web via the homepage, create or open a fictional website, then **Save & manage → Save current website to cloud**.
3. In **Connect JobFlow**, choose **Save & enable JobFlow**.
4. Return to JobFlow and choose **Simulate incoming website enquiry**. Confirm it appears in your inbox.
5. Mark the test enquiry **Completed** and choose **Send to Website**. Enter fictional, public-safe project title and description.
6. Select up to **four approved project photos** from the device. The photo picker shows previews and lets you remove choices. Images are converted/resized to JPEG (max 1600px) before upload, with a per-object 3 MB storage limit.
7. Tick the **explicit public-photo permission confirmation**; submit.
8. Open **EzySouth Web → Design Studio → Refresh completed work**. Confirm the project title, summary and photos appear in the portfolio card and website preview. Nothing gets automatically published.
9. Edit or remove a photo in JobFlow and refresh the builder. Confirm the display changes; check that removed image metadata/object is no longer referenced.

## Storage and privacy rules

- Dedicated public-read bucket `jobflow-portfolio` holds only intentionally approved public photos. Its objects become publicly accessible by URL when uploaded, **even when the website is still a private test draft**. Never upload an identifiable customer or private property photo without consent.
- Uploads and deletion are restricted by Supabase Storage row-level security to the authenticated owner and their website. File paths use `user_id/website_id/random_uuid.jpg`; no user-supplied filename or customer data enters the stored path.
- Text and photo handoffs use the existing owner-protected `jobflow_showcases` table; only completed enquiries may be featured. Only title, summary and approved photo paths go to the builder; original private enquiry text, contact and name remain in JobFlow.
- The original tenant-isolation test and the new `database/tests/jobflow_photos_rls.sql` rollback-only SQL test passed on the actual staging project. Real cross-account *browser Storage API* upload/deletion testing is still required.
- The staging security advisor separately reports leaked-password protection disabled. Enable it in Auth settings if the plan supports it before any rollout using real accounts.

## Browser and account acceptance matrix (must still be completed)

- **iPhone Safari:** log in, create/open website, save, reload; simulate an enquiry; complete and send with 1–4 actual test photos (including a photo from the camera roll); verify preview, removal, compressed uploads and errors.
- **Android Chrome:** repeat the above with a different fictional account; verify touch navigation, gallery images, and no horizontal overflow.
- **Desktop Chrome/Safari/Firefox:** check wide and narrow layouts, keyboard navigation, cloud persistence, completed project previews, and owner-only isolation.
- **Separate account / second browser:** sign in as Account B; verify Account A's websites, customers, enquiries, manual jobs and showcases are never visible, and that photo uploads using Account B's JWT cannot target Account A's website.
- **Expired session/offline conditions:** try saving while logged out and when network is disconnected. Make sure no phantom success or corrupted project state.
- **Privacy/consent:** test photo upload without the approval checkbox, oversize files, more than four photos, and deleting a featured job. None should expose private customer content.

## Automated quality gates

`node scripts/jobflow-preview-smoke.js` validates staging routes, two apps, navigation, photo upload code, JS syntax, production isolation and disabled production publishing. Workflow `.github/workflows/jobflow-preview-check.yml` runs it on the staging branch. The preexisting V7 build check continues to run. SQL database tests live under `database/tests/`.

## Release blockers: do not merge staging PR #5

The homepage replaces the old production root route, so simply merging this staging branch into `main` is **not** an acceptable deployment plan. The live product needs:

1. Explicit production release approval and a safe routing/redirect plan for existing customer URLs.
2. Production-specific media migration and policies, reviewed independently and applied only after backup.
3. Working real production enquiry/publishing endpoints and an end-to-end non-fictional hosted-page test.
4. Browser/device and two-account manual acceptance tests completed, including actual photo upload and removal.
5. Privacy notice, photo consent policy, beta participant controls, support contact, and defined rollback.
6. Check Auth redirect allowlist for `/web.html` and `/jobflow.html` in the appropriate environment.

**No production website, Supabase production data or production Netlify project has been changed.**
