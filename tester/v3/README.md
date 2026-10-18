# JobFlow Standalone Workspace V3

**Status:** Browser-only prototype. No business sign-in, database, hosted EzySouth backend or actual customer communications.

This standalone JobFlow workspace can be used without owning or publishing an EzySouth website. It is a **fictional-data tester only**. Do not enter real customer details.

## Test on a phone

Open https://raw.githack.com/traebrownboy/ezysouth/jobflow-v3-tester/tester/v3/index.html

1. Tap **Try standalone JobFlow**, then **Try a pre-filled example**. Check 3 fictional customers and 4 sample jobs.
2. Edit sample business details and verify the workspace heading changes.
3. Open **Customers**, add an imaginary customer and return to **Jobs** to create a linked job.
4. Change a job to **Completed**, try job-status filters, and remove it.
5. Attempt to delete a customer with linked jobs. It must be blocked until associated jobs are removed.
6. Press **Start over** to confirm all demo records disappear. Reload: nothing should persist.
7. Return to **EzySouth workspace** and press **Explore EzySouth Web**: the real EzySouth Web beta should open in the same tab. No integration or data sync happens.

## Safeguards
- Uses only in-memory JavaScript objects; no cookies, local storage, database, email, SMS or API calls.
- Explicit Content Security Policy disables network connections.
- Uses textContent to safely render fictional business/customer/job inputs.
- This tester is publicly reachable through a third-party HTML preview proxy, not a private staging instance.
- Does not change the main EzySouth beta, published URLs, live JobFlow enquiries or database schema.

## Tests performed
Static syntax/element checks plus 16 simulated DOM interaction checks including setup, customer/job creation, status change, filtering, deletion, business editing, reset, independent navigation and no network/storage calls. These are not a substitute for testing on iOS Safari or for backend security/end-to-end integration testing.

## Next stage
Build a staging-only Supabase schema for business ownership, membership and tenant-level access controls, then implement cloud-backed JobFlow-only sign-up and safe migration from website-scoped enquiries. Do not use production databases without a reviewed migration.