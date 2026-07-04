# Setup Progress

## 2026-07-04 — WEBSITE ORDERS PIPELINE ADDED (see WEBSITE_ORDERS.md)

Website checkout now writes rows to a `Website Orders` tab (Apps Script on the
sheet). New workflow `05_website_orders.json` watches it and reuses the same
02/03 sub-workflows. 02 patched (qty/rate support, invoice_number_hint = BGN
ref, payload-driven writeback) — backward compatible, 64/64 form tests +
25/25 website tests pass. TO DO in n8n UI: re-import 02, import 05, add
GS_WEBSITE_* variables, add Invoice ID/Sync Status columns to the tab, paste
item_config_website.csv rows. Full steps: WEBSITE_ORDERS.md.

## PRODUCTION DEPLOYMENT (switch fully to real org 871137692)

Decision: new prod Google Form + its own response tab → real Zoho org.
Reuse the same 3 workflows + n8n Variables (test stops once vars repoint).

### Step 1 — Prod Google Form + sheet
- [ ] Duplicate the TEST form (Forms → ⋮ → **Make a copy**). DO NOT rebuild —
      the code keys off exact column headers (lechon multi-select header,
      `Service Method `, `Delivery location `, etc.).
- [ ] Form → Responses → link to a spreadsheet (new is fine). Note its
      spreadsheet ID + the responses tab name.
- [ ] Add an **item_config** tab to that SAME prod spreadsheet. Paste from
      `item_config_real_org.csv`. Column D (zoho_item_id) formatted **Plain text**.
- [ ] Add two columns to the prod responses tab: **Invoice ID**, **Sync Status**
      (write-back is now enabled and targets these).

### Step 2 — Real Zoho self-client refresh token (write scope!)
- [ ] api-console.zoho.com → Self Client (org 871137692). Generate code with
      scope **`ZohoInvoice.fullaccess.all`** (read-only token won't create).
- [ ] Exchange code → refresh_token.

### Step 3 — Repoint n8n Variables
| Variable | New value |
|----------|-----------|
| GS_SPREADSHEET_ID | prod spreadsheet id |
| GS_RESPONSES_SHEET | prod responses tab name |
| GS_ITEM_CONFIG_SHEET | item_config (unchanged, now in prod sheet) |
| ZOHO_ORG_ID | 871137692 |
| ZOHO_CLIENT_ID / SECRET / REFRESH_TOKEN | real-org self-client (fullaccess) |
| ZOHO_BASE_URL / ZOHO_ACCOUNTS_URL | unchanged (.com DC) |
| NOTIFY_CHANNEL | slack |
| NOTIFY_SLACK_WEBHOOK | incoming-webhook url |

### Step 4 — Real Zoho org config
- [ ] Settings → Custom Fields → Invoices: create `cf_source_row_id`,
      `cf_fulfillment_date`, `cf_fulfillment_type` (Text, single line).
- [ ] Template: Subject **Show on PDF**; Terms & Conditions visible.
- [ ] Verify item_config_real_org.csv flagged mappings (lechon / Shanghai /
      Pansit) point at the right real item_ids.

### Step 5 — Import + activate
- [ ] Re-import all 3 workflows. Re-assign Google Sheets credential on the
      Trigger (01), Load item_config + Write back (02).
- [ ] Activate the main workflow.
- [ ] Submit one real test order → verify: invoice in real Zoho, Slack ping,
      sheet row gets Invoice ID + Sync Status, re-submit same row → idempotent.

NOTE: write-back + contact cache + success Slack only run on ACTIVE
executions, not manual Fetch Test Event.

## Completed

- [x] Repo cloned locally (`claude/eloquent-ptolemy-g92w8h`)
- [x] Zoho Self Client created — Client ID, Secret, Refresh Token obtained
- [x] Google Cloud OAuth2 client created (project: bagnetchon)
- [x] n8n project created: **Bagnetchon Automation** (jeremiahulan.app.n8n.cloud)
- [x] Google Sheets credential connected in n8n
- [x] All n8n Variables set (see table below)
- [x] Workflow JSONs updated: `$env.` → `$vars.` (n8n cloud blocks `$env`)
- [x] Sub-workflow IDs injected into `01_main.json`
- [x] All 3 workflows imported as separate workflows in n8n:
  - `Bagnetchon — Sheet Intake (main)` → ID in URL: `01_main.json`
  - `Bagnetchon — Order to Invoice (sub)` → `3mhDUwqqkQKG2sXE`
  - `Bagnetchon — Notify (sub)` → `OwMpoe36X7rPNj8l`

## n8n Variables Set

| Key | Value |
|-----|-------|
| GS_SPREADSHEET_ID | 10K7AyrIuwVTF-6OLqaK8I5K57kl-hJYZkU_FAD53cfU |
| GS_RESPONSES_SHEET | Form Responses 3 |
| GS_ITEM_CONFIG_SHEET | item_config |
| GS_WRITEBACK_INVOICE_ID_COL | Invoice ID |
| GS_WRITEBACK_STATUS_COL | Sync Status |
| ZOHO_ORG_ID | 927398966 |
| ZOHO_BASE_URL | https://www.zohoapis.com/invoice/v3 |
| ZOHO_ACCOUNTS_URL | https://accounts.zoho.com |
| NOTIFY_CHANNEL | none |
| AUTO_FINALIZE | false |
| ZOHO_CLIENT_ID | (set — not shown) |
| ZOHO_CLIENT_SECRET | (set — not shown) |
| ZOHO_REFRESH_TOKEN | (set — not shown) |

## Pending / Next Steps

### 0. Zoho auth — SOLVED via self-refresh (no n8n Zoho credential)
n8n's built-in Zoho credential is CRM-scoped (no Invoice scope) and generic
OAuth2 sends `Bearer` while Zoho needs `Zoho-oauthtoken`. So instead:
- Added **Zoho Auth** node (POST refresh_token → access_token) as first step
  in sub-workflow, between From Caller and Validate Payload.
- All 5 Zoho HTTP nodes now use header auth:
  `Authorization: Zoho-oauthtoken {{ $('Zoho Auth').item.json.access_token }}`
- Reuses ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN vars. No new Zoho app needed.

## STATUS as of last session (2026-06-14 evening)

END-TO-END WORKS. A real draft invoice (INV-000001) was created in Zoho from
a form row — contacts, line items, rates, notes, custom fields all correct.

Bugs found & fixed live this session (all pushed):
- $env→$vars; checkbox-form redesign; Zoho auth header; item_config fan-out
  (16x duplicate runs); main Code nodes dropping all-but-first row; Contact
  Resolved merge blocking the create-contact path; item matching switched to
  match_text-only (multi-line lechon header was too fragile).
- Invoice custom_fields trimmed to 3 (Zoho plan limit); event/guests in notes.
- Pulled all 16 Zoho item_ids via API, filled item_config.csv.

### WHERE YOU LEFT OFF — do next:
1. **Paste the 16 item_ids into the Google Sheet item_config tab as TEXT.**
   Google Sheets rounds 18-digit ids if stored as numbers. Select column D →
   Format → Number → Plain text → paste ids (see item_config.csv for values).
   Verify D2 shows full 245500000000102576 left-aligned.
2. Run a test → line items should use item_id, review empty, no [REVIEW] notes,
   prices from Zoho catalog.
3. Delete duplicate Jeremiah/Test contacts in Zoho (from rapid testing / index lag).
4. (Production) Add `Invoice ID` + `Sync Status` columns to Form Responses 3,
   activate the main workflow, then enable Write back to Source Row node.
   row_number only populates on live trigger (not manual Fetch Test Event).
5. Verify idempotency: re-run same row → should hit Exit Idempotent, no 2nd invoice.

### Known notes:
- CURRENCY: Zoho org is PHP. Once item_ids are set, invoices use Zoho catalog
  prices (PHP). default_rate only used as ad-hoc fallback.
- Dedup relies on Zoho contact search, which lags for freshly-created contacts.
  Fine in production (orders spaced out); rapid testing creates duplicates.
- Reference import CSVs are in `Import files/` and `zoho_items_import.csv`.

## Verified by local tests (2026-06-14, while you slept)

Ran `node tests/node-logic.test.js` — **25/25 pass**. This runs the REAL
Code-node logic from the workflow JSON against the real form row +
item_config.csv, in a mock n8n runtime. What it proves:

- Validate Row: accepts the real order; rejects bad email + Delivery-without-address.
- Normalize Order: splits the lechon multi-select into separate items, lowercases
  email, captures fulfillment, hashes a stable source_row_id.
- Build Line Items: matches all 3 selected items against item_config **despite
  the double-spaces** in the form text (whitespace-normalized match works).
  qty=1 each, rates from default_rate.
- Catalogued path: when a row has a zoho_item_id, it emits `item_id` instead of
  ad-hoc name/rate (verified by injecting a test id).
- Build Invoice Payload: shipping_address on delivery, review flags in notes,
  cf_source_row_id present.
- Notify path: bad row → notify payload → formatted message with errors.

I could NOT run the live n8n cloud (no API access to your instance, browser tool
not connected). The steps below need you in the n8n UI.

## Bugs found & fixed tonight (all committed + pushed)

1. **$env → $vars** — n8n cloud blocks $env. (commit e2f783d)
2. **Checkbox-form redesign** — form uses checkbox selections, not qty inputs;
   rewrote item_config (match_text col) + Validate/Normalize/Build Line Items.
3. **payment_method stale ref** — form has no payment question; removed. (fd19f7b)
4. **Zoho auth** — added Zoho Auth node + Zoho-oauthtoken header. (d10708b)
5. **item_config FAN-OUT (critical)** — Load item_config emitted 16 items, so the
   whole pipeline ran 16× → duplicate contacts/invoices. Added "Single Order"
   collapse node. (4dc1658) THIS is why you saw duplicate Jeremiah contacts.

## DO THIS IN THE MORNING (n8n UI)

### A. Re-import the latest sub-workflow
`02_order_to_invoice.json` changed since your last import (Single Order node).
Re-import it into **Bagnetchon — Order to Invoice (sub)**, then re-assign the
`Google Sheets account` credential on **Load item_config** and **Write back to
Source Row** (import wipes credential links).

### B. Delete the duplicate test contacts in Zoho
Zoho Invoice → Contacts → delete the extra "Jeremiah" entries created during
testing (IDs ...101001, ...102001, and any more). Keep none or keep one — the
workflow will match-or-create on next run.

### C. Re-run from main and confirm single-pass
Sheet Intake (main) → trigger → Fetch Test Event → click **Call: Order → Invoice**
→ Execute. Open the sub-execution. Confirm:
- Each node runs ONCE (not 16×).
- Find Contact by Email matches the existing Jeremiah → no new contact.
- Build Line Items: 3 line items, review has 3 entries (expected — no zoho_item_id yet).
- Return Summary: ok=true, contact_lookup="matched_email", invoice_id=null
  (Create Draft Invoice still disabled).

### D. Fill zoho_item_id in item_config (optional, removes [REVIEW] flags)
For each menu item, create it in Zoho Invoice → Items, copy its item_id into the
`zoho_item_id` column of the item_config tab. Items left blank still work (ad-hoc
line with default_rate + a [REVIEW] note on the draft).

### E. Enable the two disabled nodes + smoke test
In the sub-workflow, enable **Create Draft Invoice** and **Write back to Source
Row**. Run once. Verify a Draft invoice appears in Zoho and the sheet row gets
Invoice ID + Sync Status. Re-run the same row → should hit the idempotent branch
(no second invoice).

## Open items / decisions for you

- **CURRENCY**: Zoho org base currency is **PHP**. The form prices are US dollars
  ($25, $120, ...). Line-item rates (25, 120, ...) will be billed as ₱ not $.
  Decide: change Zoho org/currency to USD, or treat numbers as PHP. Business call.
- **cf_ custom fields**: Build Invoice Payload sends custom_fields with labels
  cf_source_row_id, cf_fulfillment_date, cf_fulfillment_type, cf_event_type.
  These MUST exist in Zoho Invoice → Settings → Custom Fields → Invoices, or the
  invoice create call will reject them. Create them before enabling the invoice node.
- **NOTIFY_CHANNEL=none**: notifications are silently dropped. Set a Slack webhook
  (NOTIFY_SLACK_WEBHOOK + NOTIFY_CHANNEL=slack) when you want failure alerts.
- **TEST_PLAN.md is stale**: written for the old qty-based model. Scenarios still
  describe item_quantities / "Lechon Belly (1kg)" columns. Needs a rewrite for the
  checkbox model if you want it as the canonical manual test doc.

## How to re-run the local tests anytime
```
node tests/node-logic.test.js
```
No deps, no n8n needed. Edit the fixture row at the top of the test if the form changes.

## Key facts (n8n Variables hold the real secret values — never committed)
Zoho org: `.com` DC, org_id 927398966, refresh token does not expire.
Google Sheet 10K7Ayr... linked to the Google Form, tab `Form Responses 3`.
n8n: jeremiahulan.app.n8n.cloud (14-day trial as of 2026-06-14).
Sub-workflow IDs: Order→Invoice 3mhDUwqqkQKG2sXE, Notify OwMpoe36X7rPNj8l.
