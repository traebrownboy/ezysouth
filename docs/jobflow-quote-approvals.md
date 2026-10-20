# JobFlow customer quote approvals (STAGING)

Target: https://ezysouth-jobflow-test.netlify.app/ — branch `jobflow-netlify-test`. **Do not deploy to production without a real browser/end-to-end security test.**

## Customer flow
1. Business creates a priced, GST-reviewed quote and shares a private link via Quotes & Invoices.
2. Recipient opens the same `jobflow-view.html?token=...` link used by the existing sharing feature.
3. For **quotes** only, a response section offers **Accept Quote** or **Decline Quote** after entering a name and confirming.
4. The private token is the only access key. The system does not verify that the person opening the link is the named customer. This limitation is stated in the UI.
5. The response writes back to the original quote status in the owner's JobFlow account, with a timestamp and stated respondent name in Share history. The Quotes list refreshes approximately every 30 seconds while visible.
6. Acceptance creates one linked **invoice draft** if necessary; it does **not** email the invoice, take payment or begin the job. Declining voids only an existing, still-draft linked invoice; already-issued invoices are never silently voided.

## Security and consistency
- Only the staging Supabase Edge Function `jobflow-quote-approval` can invoke `jobflow_record_quote_decision` through the server service role. The SQL function is explicitly not executable by `anon` or `authenticated`.
- A decision is atomic within one database transaction. The function locks the delivery and quote, checks expiry/revocation, checks that the snapshot matches the current material quote terms, and records the response only once.
- A subsequent request using the same link cannot change an existing decision. Another link cannot respond after the quote is already closed.
- Recipients can review read-only document terms before responding; private links remain valid for viewing until revoked or expired even if a response was already recorded.
- Customer names in the viewer and owner history are escaped or rendered as text. Link tokens are not stored in the owner document rows or delivered in SQL query arguments (only their SHA-256 hashes are stored).
- The database uses NZ-local time for quote expiry checks as appropriate for NZ documents.

## Validation carried out
- Tested quote acceptance and automatic invoice draft creation in a database transaction, then rolled back.
- Tested idempotent repeated submissions, stale/changed terms, revoked links, declined quotes voiding only draft invoices. All rolled back.
- Tested a simulated customer Accept button click, including the user-visible confirmation and updated response state.
- Verified new Edge Function is deployed only to staging, SQL execute privileges are service-role-only, and existing published and root document HTML are in sync.
- Unable to independently verify the complete Netlify browser flow in this environment. Test with fictional customer details first.

## Further steps before a production beta
- Test acceptance and decline from a second browser/device, using two private links to the same quote.
- Verify the customer's full name or provide signed acceptance records if legal evidence of consent is needed.
- Add owner notifications (email/in-app) once a sending provider is configured.
- Finish complete NZ taxable supply information and business identity requirements before actual invoicing.
