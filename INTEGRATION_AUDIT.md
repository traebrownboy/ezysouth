# Ezysouth integration audit — 22 October 2026

**Scope:** Read-only review of existing GitHub branches. This is a proposed merge plan, not proof that unmerged features work.

## Branch inventory

| Branch | Compared with main | What it contains | Caveat |
|---|---:|---|---|
| `main` | baseline | V7 website builder / Growth Loop | Production reference. Do not casually rewrite |
| `feature/jobflow-business-workspace` | 11 commits ahead | Experimental V3 JobFlow sample business, jobs and customer workspace under `tester/v3/` | Tester/demo, not a verified production service |
| `feature/jobflow-staging-safety` | 28 commits ahead | Standalone `jobflow.html`, customer/job UI, staging security/database migrations and tests | Needs staging verification and safe database deployment review |
| `feature/jobflow-quotes-invoices` | 2 commits ahead | Standalone `jobflow-documents.html` quotes/invoices screen, linked from builder | Stores records in browser localStorage, not shared business database |
| `development/preview` | separate commits from main | A sandbox build of V7, CI checks and optional Cloudflare Pages preview setup | No real production cloud connections |

## Key product principle

One business, one customer record, one job lifecycle. Linked quotes, accepted work, completion, invoice and payment status should refer to the same business-scoped records.

A working standalone demo is not the same as a verified live, secure, multi-business system. In particular, locally stored quote/invoice data should never be presented as synchronised cloud records.

## Recommended next stages

1. Owner tests the isolated V7 preview and confirms its layout, mobile fit and core user flow.
2. Inspect and test each unmerged JobFlow prototype. Reuse good code, but do not merge prototype branches blindly into the production builder.
3. Establish business-scoped canonical customer/job/quote/invoice data models, roles, permissions and separate test environment.
4. Connect the JobFlow workspace to customer records and website enquiries.
5. Add universal search across names, job numbers and addresses; ensure completed and archived jobs remain searchable.
6. Link quote approval → scheduled job → completed record → invoice, preserving history and avoiding duplication.
7. Test zero data crossover between businesses, privacy and backup/recovery, mobile responsiveness, cloud persistence and publishing stability.
8. Release only with explicit approval, versioned migrations, regression tests and rollback.

## Hard limits

- Do not publish to Netlify, deploy database migrations or send email/SMS without explicit owner approval.
- Never point the public development playground to the production backend.
- Preserve existing customer website domains and links.
- Do not claim that planned features are already available.
