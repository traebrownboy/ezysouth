# JobFlow document delivery (isolated staging)

This change is intended for the Netlify site \`ezysouth-jobflow-test.netlify.app\` on the \`jobflow-netlify-test\` branch only. Do not deploy this branch/function or its database migrations to the main Ezysouth project without review.

## Current customer workflow

1. In JobFlow Quotes & Invoices, finish the amount and GST treatment.
2. Choose **Share** on the document.
3. Choose **Create secure link**, then **Copy link** or **Open email app**. This creates a 14-day, revocable private link. Creating a link **does not send an email or update the document status**.
4. Customer opens the secure link on the Netlify test site, sees a branded, read-only snapshot and can print/save as PDF.
5. **Sharing history** shows created links, opens and any confirmed email provider acceptance. The user can revoke the link at any time.

The private token is 32 random bytes and only its SHA-256 hash is stored in the staging database. The API verifies token expiry/revocation before returning a fixed snapshot. Access to history uses RLS. A link's recipient need not sign in, so anyone with the link can read that snapshot until expiry or revocation. Remind users not to post links publicly.

## Optional direct email

The staging Supabase Edge Function \`jobflow-document-delivery\` supports direct transactional email via Resend, but the sending button is enabled **only when the function can detect both of these secrets**:

- \`RESEND_API_KEY\`: API key from Resend (never store in GitHub or browser code).
- \`JOBFLOW_FROM_EMAIL\`: fully qualified **verified domain** sender, for example \`Ezysouth <quotes@your-verified-domain.example>\` when the provider accepts this sender format. The function currently validates a plain email address, so use \`quotes@your-verified-domain.example\` at present.

Set these secrets in the **isolated staging Supabase project's Edge Functions Secrets** settings. Verify the sender domain with Resend first. After saving the secrets, check the capabilities endpoint and test with addresses you control.

Direct sending requires an explicit confirmation click, an authenticated user, an owned, priced document, valid GST treatment, and a recipient email. Upon provider acceptance, the delivery is logged as **Email accepted**, not guaranteed delivered. The original document's status is changed only after the email provider accepts the request. Provider failures revoke the pending private link.

Do not use real customers during the staging beta. Before production launch, verify NZ taxable supply information requirements, business addresses and payment details, final PDF layout, provider configuration and domain reputation, bounced email handling, delivery idempotency/retries, message rate limits and customer support procedures.

## Verification completed

- GitHub source and staging Supabase function deployed.
- JavaScript syntax of inline editor, helper and customer viewer checked.
- Database has RLS enabled; only signed-in owners can view delivery logs. Browser roles cannot insert/update delivery records.
- Static checks confirmed all frontend URLs point to the **staging** Supabase project.
- Full deployed browser + real email provider end-to-end testing has **not yet been completed**. No domain credentials were installed by this change.

Useful documentation: https://supabase.com/docs/guides/functions/examples/send-emails
