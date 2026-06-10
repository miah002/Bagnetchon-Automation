# Bagnetchon — Order to Invoice Automation

Turns a new Google Form order into a **draft** Zoho Invoice, with no
manual re-keying. Built for n8n Cloud (Starter plan or higher).

This README is written for a non-developer. If something is unclear, ask
in the team chat before changing it — most "fixes" can be done by
editing the spreadsheet, not the workflow.

---

## 1. How the flow works (in plain English)

1. A customer submits the Google Form.
2. Google adds a row to the linked spreadsheet's **Form Responses** tab.
3. Within ~1 minute, n8n notices the new row, validates it, and converts
   it into a normalized "order" object.
4. n8n calls a Zoho-specific sub-workflow that:
   - Checks whether this exact order was already invoiced (idempotency).
     If yes, it stops and does nothing.
   - Looks up the customer in Zoho by **email**. If there's no email
     match, it falls back to **phone**. If neither matches, it creates
     a new Zoho contact.
   - Reads the `item_config` tab to convert each "qty" column into a
     Zoho line item.
   - Creates a **draft** invoice with the order's special instructions,
     fulfillment date/type, payment method, and shipping address (if
     Delivery).
   - Writes the new invoice ID and sync status back to the source row.
5. If anything fails — bad email, Zoho 500, uncatalogued item, etc. —
   a Slack message or email is sent (your choice) with the row and the
   error.

The Zoho invoice is **always** created in **draft** state in v1. Nothing
is sent to the customer automatically. You review the draft in Zoho and
finalize manually.

---

## 2. Architecture

```
 Google Form
     │
     ▼
 Sheet: "Form Responses 1"  (one row per order)
     │
     ▼
┌──────────────────────────────────────────┐
│ n8n Workflow 1 — Sheet Intake (main)     │
│  • Trigger on new row                    │
│  • Validate row                          │
│  • Normalize → "order" object            │
└──────────────────────────────────────────┘
     │ (on valid)                  │ (on invalid)
     ▼                             ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│ Workflow 2 — Order to   │   │ Workflow 3 — Notify      │
│ Invoice (sub)           │   │ (sub)                    │
│  • Idempotency check    │   │  • Slack OR email        │
│  • Contact dedupe       │   └──────────────────────────┘
│  • Build line items     │
│  • Create DRAFT invoice │
│  • Write back to sheet  │
└─────────────────────────┘
     │ (on error)
     ▼
   Workflow 3 — Notify

 [Future] Native form → Supabase row → calls Workflow 2 directly,
          producing the same "order" object. No edits to Workflow 2 needed.
```

The **"order" object** is the contract between the intake (Google Sheet
today, Supabase form later) and the Zoho sub-workflow. Both intakes will
produce the same shape:

```json
{
  "source": "google_sheet | supabase_form",
  "source_row_id": "<source-prefix>:<stable-id>",
  "customer":     { "email": "...", "name": "...", "phone": "..." },
  "fulfillment":  { "date": "YYYY-MM-DD", "type": "Pickup|Delivery", "address": "..." },
  "payment_method":       "...",
  "special_instructions": "...",
  "item_quantities":      { "Lechon Belly (1kg)": 2, "Bagnet (1kg)": 1 },
  "writeback":            { "kind": "google_sheet", "...": "..." }
}
```

---

## 3. Repo layout

```
.
├── README.md                              this file
├── TEST_PLAN.md                           9 scenarios to verify
├── .env.example                           which values go in n8n env / credentials
├── item_config.csv                        template for the config tab
├── workflow.json                          all three workflows (n8n CLI import)
├── workflows/
│   ├── 01_main.json                       Sheet Intake (GUI import)
│   ├── 02_order_to_invoice.json           Zoho sub-workflow (GUI import)
│   └── 03_notify.json                     Slack/email sub-workflow (GUI import)
├── nodes/                                 readable JS source for each Code node
└── scripts/build_workflow.py              rebuilds workflow.json from nodes/
```

---

## 4. One-time setup

### 4.1 Google Sheet

The Form-linked spreadsheet needs **three** tabs:

#### Tab: "Form Responses 1" (auto-created by Google Form)

These column headers must exist exactly (one column per item; add or
rename freely AS LONG AS you also update `item_config`):

| Column                | Source              | Notes                          |
|-----------------------|---------------------|--------------------------------|
| Timestamp             | auto                | from Google Form               |
| Email                 | Form short-answer   | required                       |
| Name                  | Form short-answer   | required                       |
| Contact Number        | Form short-answer   | required for phone fallback    |
| Fulfillment Date      | Form date picker    | required                       |
| Fulfillment Type      | Form dropdown       | "Pickup" or "Delivery"         |
| Delivery Address      | Form long-answer    | required if Delivery           |
| Payment Method        | Form dropdown       |                                |
| Special Instructions  | Form long-answer    |                                |
| (one column per SKU)  | Form number field   | e.g. "Lechon Belly (1kg)"      |
| Invoice ID            | written by n8n      | leave blank                    |
| Sync Status           | written by n8n      | leave blank                    |

Each SKU column must be a **Number** question in the Form. Don't add a
"What do you want?" free-text question — there's nothing to parse.

#### Tab: "item_config" (you create this)

This is the single source of truth that maps Sheet columns to Zoho
items. Header row:

```
sheet_column_header,zoho_item_id,item_name,active,default_rate
```

| Column                | What it is                                                  |
|-----------------------|-------------------------------------------------------------|
| sheet_column_header   | Exact header from the Form Responses tab (case-sensitive)   |
| zoho_item_id          | Zoho item ID from the Items page. **Leave blank for ad-hoc**|
| item_name             | Display name on the invoice line if used as ad-hoc          |
| active                | `true` or `false`. Inactive rows are ignored.               |
| default_rate          | Optional. Used only when `zoho_item_id` is blank.           |

See `item_config.csv` for a starter template.

#### Tab: "Form Responses 1" — write-back columns

Add two empty columns to the right of the auto-generated form columns:
**"Invoice ID"** and **"Sync Status"**. The sub-workflow writes the
created invoice's id and `draft` / `sent` status here.

### 4.2 Zoho Invoice — custom fields

In **Zoho Invoice → Settings → Custom Fields → Invoices**, create these
custom fields. Labels MUST match exactly:

| Label                | Data type      | Notes                              |
|----------------------|----------------|------------------------------------|
| cf_source_row_id     | Single line    | Idempotency key. Must be filterable.|
| cf_fulfillment_date  | Date           |                                    |
| cf_fulfillment_type  | Dropdown       | values: Pickup, Delivery           |
| cf_payment_method    | Single line    |                                    |

For `cf_source_row_id`, in the field configuration, tick **"Make this a
search criteria"** — that's what lets the GET-by-custom-field query work.

### 4.3 Zoho Self Client OAuth (server-to-server)

This gives n8n a refresh token that never expires (unless revoked) and
lets the workflow run unattended.

1. Go to **https://api-console.zoho.com** → **Add Client** →
   **Self Client**.
2. Note down the **Client ID** and **Client Secret**.
3. On the **Generate Code** tab:
   - Scope: `ZohoInvoice.contacts.ALL,ZohoInvoice.invoices.ALL,ZohoInvoice.settings.READ`
   - Time duration: 10 minutes
   - Scope description: `Bagnetchon automation`
   - Click **Create** → copy the **code** (valid only for 10 minutes).
4. In a terminal, exchange the code for a refresh token (replace the
   placeholders):

   ```bash
   curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
     -d "grant_type=authorization_code" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "code=THE_CODE_FROM_STEP_3"
   ```

   The response contains a `refresh_token`. Save it — Zoho only
   shows it once.
5. If your Zoho account is in a non-`.com` data center (EU, IN, AU,
   etc.), substitute the matching `accounts.zoho.<tld>` URL in the
   curl above AND set `ZOHO_BASE_URL` / `ZOHO_ACCOUNTS_URL` accordingly
   in `.env`.

### 4.4 n8n credentials

In your n8n instance:

1. **Settings → Variables** — set the keys from `.env.example` that are
   NOT secrets (`ZOHO_BASE_URL`, `ZOHO_ACCOUNTS_URL`, `ZOHO_ORG_ID`,
   `GS_SPREADSHEET_ID`, `GS_RESPONSES_SHEET`, `GS_ITEM_CONFIG_SHEET`,
   `NOTIFY_CHANNEL`, `NOTIFY_SLACK_WEBHOOK`, `NOTIFY_EMAIL_TO`,
   `NOTIFY_EMAIL_FROM`, `AUTO_FINALIZE`).
2. **Credentials → New** — create three credentials:
   - **Google Sheets OAuth2 API** — log into the Google account that
     owns the spreadsheet, grant access.
   - **Zoho OAuth2 API** (Generic OAuth2 if no Zoho preset is offered):
     - Client ID / Client Secret from step 4.3
     - Access Token URL: `https://accounts.zoho.com/oauth/v2/token`
     - Pre-paste the refresh token (n8n will refresh access tokens
       automatically on each use).
   - **SMTP** (only if `NOTIFY_CHANNEL=email`) — sender SMTP for
     notification emails.
3. **NEVER** put any of these values inside Code nodes, the sheet, or a
   committed file.

### 4.5 Import the workflows

Two ways:

- **GUI** — Open n8n → **Workflows → Import from File**. Import each
  file in `workflows/` one at a time, starting with `03_notify.json`,
  then `02_order_to_invoice.json`, then `01_main.json`. Pick the
  Google / Zoho / SMTP credentials in each node as prompted.
- **CLI** — `n8n import:workflow --input=workflow.json`.

After import, open **Workflow 1 (Sheet Intake)**, find the two
`Call: ...` nodes, and pick the matching sub-workflow from the
dropdown. Do the same for the `errorWorkflow` setting in
**Workflow 2 (Order to Invoice)** → **Workflow Settings → Error
Workflow → Bagnetchon — Notify (sub)**.

### 4.6 First-run safety: two nodes start DISABLED

Two nodes in Workflow 2 ship **disabled** so an accidental import
doesn't create real Zoho records or write to the sheet:

- **Create Draft Invoice** (HTTP POST to Zoho)
- **Write back to Source Row** (Google Sheets update)

Run through `TEST_PLAN.md` scenarios 1–8 with these disabled first —
you'll see exactly what payload would be sent. Then enable them.

### 4.7 Activate

Once the test plan passes, toggle **Workflow 1** to **Active**.
Workflows 2 and 3 do NOT need to be activated — they're called as
sub-workflows.

---

## 5. Daily operations

### Add a new menu item

1. Add a Number question to the Google Form. Use the exact name as the
   header (e.g. `Lechon Belly (2kg)`).
2. Add a row to the `item_config` tab:
   - `sheet_column_header` = `Lechon Belly (2kg)`
   - `zoho_item_id` = the Zoho item ID from Zoho Invoice → Items
   - `item_name` = `Lechon Belly (2kg)`
   - `active` = `true`
   - `default_rate` = leave blank if `zoho_item_id` is set
3. Done. No workflow edit needed.

If you don't yet have the Zoho item set up, leave `zoho_item_id` blank
and put a price in `default_rate`. The line will appear as ad-hoc, and
the invoice notes will get a `[REVIEW: uncatalogued item ...]` line so
you remember to wire it up properly later.

### Re-process a row

The idempotency key is a hash of (timestamp + email). If you re-run a
row manually in n8n, the Zoho "GET by cf_source_row_id" returns the
existing invoice and the workflow exits cleanly with
`idempotent: true` in the summary. To force re-processing, you have to
either delete the Zoho invoice or change the row's timestamp.

### Flip AUTO_FINALIZE (do NOT do this without approval)

Not wired in v1. Even when you do wire it up, the Zoho `mark as sent`
call is irreversible — drafts can be deleted, sent invoices can't.

---

## 6. Troubleshooting

| Symptom                                | Where to look                                   |
|----------------------------------------|-------------------------------------------------|
| New rows aren't picked up              | Workflow 1 is Active? Google credential OK?     |
| Validation failures                    | Notification text shows which fields failed     |
| `Could not resolve a Zoho contact_id`  | The customer's email/phone don't match and the create call failed — check Zoho permissions |
| `No line items produced`               | The qty columns aren't in `item_config`, or all qty values are 0 |
| Invoice has `[REVIEW: ...]` notes      | Some lines are ad-hoc — fix `item_config`       |
| Workflow re-runs but does nothing      | That's idempotency working                      |

The summary the sub-workflow returns includes `review_flags` — if
non-empty, the draft needs a human pass before sending.

---

## 7. Roadmap — future Supabase intake

When the native form is built, a new workflow (or webhook trigger) will:

1. Receive a Supabase insert webhook on the `orders` table.
2. Map the row to the same normalized "order" shape, with
   `source: "supabase_form"` and `source_row_id: "sb:<orders.id UUID>"`.
3. Call the same `Bagnetchon — Order to Invoice (sub)` workflow.

No changes to Workflow 2 are needed. The `item_config` table can stay
in Google Sheets OR be moved to Supabase — Workflow 2 just needs the
read step changed.

---

## 8. Rebuilding `workflow.json` after editing Code-node JS

```bash
python3 scripts/build_workflow.py
```

This re-reads everything in `nodes/`, re-emits `workflow.json` and the
three files in `workflows/`. Re-import in n8n (or use the
`n8n import:workflow --separate` flag to overwrite by id).
