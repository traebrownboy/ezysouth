# EzySouth two-product hub: offline prototype

This is a **branch-only** exploratory prototype for **EzySouth Web** and **JobFlow by EzySouth**. It lives on `prototype/two-product-hub`; it is **not** a published, secure production product.

## What is included
- A workspace screen describing two independent products and planned optional connection.
- An EzySouth Web product overview that does **not** contact or modify live websites.
- A JobFlow demonstration using four fictional enquiry records.
- In-memory adding/filtering/status transitions and a demo reset button.

## Safe test rules
- No live Supabase access, authentication or website publishing.
- No SMS, email, external API calls or customer-data collection.
- No browser persistence: demo entries disappear on reload.
- Inline Content Security Policy prohibits external connections (`connect-src 'none'`).
- Do **not** enter real customer names, phone numbers or other private information.
- Testing here does not demonstrate business account security, production backend behaviour, real messaging or live website integration.
- This folder is not referenced by the existing `scripts/build-production.js`; no customer-site export code has been changed.

## Local test
1. Download `prototypes/product-hub/index.html` from the prototype branch.
2. Open it in a modern browser locally. This requires no server or connection.
3. Choose JobFlow and create a fictional enquiry.
4. Change its status to Quote sent or Completed; check the counters.
5. Filter enquiries, reset the demo, navigate to EzySouth Web and back.
6. Reload the page and verify demo edits are discarded.

The current interaction checks are a mocked DOM exercise of the committed code. Additional iOS Safari, Chromium and accessibility tests should be performed before any public demo.

## Next steps
See [architecture issue #4](https://github.com/traebrownboy/ezysouth/issues/4) for the safe business-account separation plan and [messaging issue #3](https://github.com/traebrownboy/ezysouth/issues/3) for future quote/email/SMS integration.

## No production deployment
Do **not** merge this branch into `main` or open a PR that automatically creates a Netlify deploy preview until the owner is ready to test a hosted preview and confirms appropriate site/privacy controls. Netlify project branch-deploy settings should also be checked before assuming branch changes are completely private.