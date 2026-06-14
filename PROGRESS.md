# Setup Progress

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

### 1. item_config tab in Google Sheet (DONE)
Add a new tab named exactly `item_config` to the spreadsheet.
Columns (row 1 = headers):

```
sheet_column_header | zoho_item_id | item_name | active | default_rate
```

Rows to add:
```
Lechon Belly (1kg)    | <zoho_item_id or blank> | Lechon Belly (1kg)    | true | <price or blank>
Whole Lechon (~10kg)  | <zoho_item_id or blank> | Whole Lechon (~10kg)  | true | <price or blank>
Bagnet (1kg)          | <zoho_item_id or blank> | Bagnet (1kg)          | true | <price or blank>
Roasted Pork (1kg)    | <zoho_item_id or blank> | Roasted Pork (1kg)    | true | <price or blank>
```

- `zoho_item_id`: find in Zoho Invoice → Items. Leave blank to use ad-hoc line item path.
- `sheet_column_header`: must match **exactly** the column header in `Form Responses 3`.
- `default_rate`: unit price fallback if not in Zoho catalog.

### 2. Confirm Form Responses 3 column headers
Open `Form Responses 3` tab → share exact header names for quantity columns.
Must match `sheet_column_header` in item_config byte-for-byte.

### 3. Assign Google Sheets credential on all nodes
In each workflow, open any Google Sheets node with orange warning → assign `Google Sheets account` credential.

### 4. Test dry run (TEST_PLAN scenarios 1–7)
- Enable main workflow
- Pin mock data on trigger node
- Walk through TEST_PLAN.md scenarios 1–7 (no real Zoho writes — Create Draft Invoice is disabled)

### 5. Enable disabled nodes (after dry run passes)
Two nodes in `Order to Invoice (sub)` are `disabled: true`:
- `Create Draft Invoice` — POST to Zoho
- `Write back to Source Row` — Sheets update

Enable only after dry run confirms correct payload.

### 6. End-to-end smoke test (TEST_PLAN scenario 9)
Submit real Google Form → verify invoice created in Zoho → check sheet writeback.

## Key Credentials (stored in n8n Variables — do not commit real values)
Zoho org: `.com` data center. Refresh token does not expire.
Google Sheet: linked to Google Form (Form Responses 3 tab).
n8n instance: jeremiahulan.app.n8n.cloud (14-day trial as of 2026-06-14).
