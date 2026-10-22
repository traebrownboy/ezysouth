# Ezysouth Product Blueprint
## Business Made Simple.

Owner-approved direction: 22 October 2026. This is a roadmap, not a promise that all features are already shipped.

## Seven rules
1. Simple: Plain language, short workflows, no unnecessary buttons.
2. Premium: Polished, consistent design on all screens.
3. Connected: Enter customer/job details once; reuse them throughout the workflow.
4. Easy to navigate: Predictable navigation, no dead buttons.
5. Responsive: Phone-first, excellent on desktop.
6. Reliable: Secure saving, permissions, stable websites, recovery and testing.
7. No cutting corners: Test every change and protect customer data.

## Our product
One Ezysouth account with Ezysouth Web (website builder, draft/preview/publish, domains) and JobFlow (customer records, enquiries, quotes, scheduling, completed work, invoicing). Keep the tools useful independently and powerful together.

## Phase 1: Perfect foundations for tradies / service businesses
Already present in JobFlow Test staging, at varying stages of completion: shared staging login, website builder, test publishing, enquiry inbox, customer records, job scheduling and photos, archive/Trash, quotes/invoices, some linking.
Build / validate in order:
1. Search jobs across customer, job title, location, reference, active/completed/archived history. A first version is on the development branch only, not released.
2. Connect website enquiries, customers, scheduled jobs, quotes and invoices to consistent business-scoped records; prevent duplicates.
3. Customer history: jobs, quotes, invoices, approved project photos and notes.
4. Quote accepted -> job booked -> completed -> invoice -> payment *recorded*, distinguishing records from actually sending or processing payment.
5. Today dashboard: urgent enquiries, jobs due, overdue invoices, next useful action.
6. Website builder and publishing: Coastal Clean layout benchmark, reliable private previews, publishing updates to the same domain, version history and rollback.
7. Test phone, desktop, privacy, cloud saving, RLS access, backups and recovery.

## Phase 2: Personalised business setup
Ask at signup: What kind of business? What do you offer? What must the website achieve (enquiries, showcase, appointments, sales)?
Recommend appropriate design and modules, and allow later changes. Show only completed, functional options.

## Phase 3: Other industries
After proven tradie value, explore retail catalogue/stock/orders and hospitality modules based on customer demand. Modular, never bloated.

## Phase 4: Refine and grow
Customer feedback, accessibility, reliability, secure performance, NZ-specific details, long-term ambition to serve small businesses broadly.

## Later candidates (not all for v1)
Customer portal, reminders, recurring jobs, activity timeline, job templates, staff roles, flexible modules and integrations.

## Delivery and safety
- Existing staging version: GitHub branch jobflow-netlify-test, site https://ezysouth-jobflow-test.netlify.app/
- Development source branch: development/jobflow-test-preview, branched from jobflow-netlify-test.
- Production is separate: main and https://ezysouth.netlify.app/
- Develop and test on the development branch. Never publish to either Netlify site, merge to deployed branches, run migrations or send customer messages without explicit approval.
- Use fictional test details; do not leak between business accounts.
- Automated tests plus hands-on real-device testing before any release.
- Pricing is not decided. The discussed roughly NZ$49.99 monthly flagship is a hypothesis, not an announced price.

## Launch acceptance journey
Sign in -> create fictional business -> build site -> receive enquiry -> find customer -> quote -> schedule -> complete -> invoice -> record payment -> optionally share approved work on website, with safe domains and no duplicate data.

Make the business fit the tool? No. Make the tool fit the business.
