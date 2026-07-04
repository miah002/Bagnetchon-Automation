# Website Orders → n8n → Zoho Invoice

Website checkout orders land in a **`Website Orders`** tab (written by the
site's Apps Script — see `docs/integrations/google-sheet-orders.md` in the
brand-launch repo). Workflow **05** watches that tab and reuses the existing
Order → Invoice and Notify sub-workflows, so contacts, idempotency, Zoho auth,
and Slack pings are all shared with the form pipeline.

```
01 Sheet Intake (form tab)      ─┐
                                 ├→ 02 Order → Invoice (sub) → 03 Notify (sub)
05 Website Orders Intake (new)  ─┘
```

## What's different about website rows

| | Form rows | Website rows |
|---|---|---|
| Items | checkbox labels, qty always 1 | `2× Beef Kare Kare — Full Tray @ $265; …` (real qty + server-computed price) |
| Invoice number | customer initials + MMDDYY | the order ref (`BGN-…`) — unique per order, so two same-day orders can't collide |
| Line-item rate | Zoho catalog / item_config default | the website's charged price (overrides catalog so the invoice always matches checkout) |
| Writeback | `Invoice ID` / `Sync Status` on the form tab | same columns on the **Website Orders** tab |

Supported by three backward-compatible patches in `02_order_to_invoice.json`
(`scripts/patch_02_website_support.py`): `invoice_number_hint`,
`selected_items[].qty/.rate`, payload-driven writeback target.
Form regression: `node tests/node-logic.test.js` (64 ✓). Website path:
`node tests/website-order.test.js` (25 ✓).

## n8n setup (one time)

1. **Re-import `02_order_to_invoice.json`** into *Bagnetchon — Order to
   Invoice (sub)* (it changed). Re-assign the `Google Sheets account`
   credential on **Load item_config** and **Write back to Source Row**
   (import wipes credential links).
2. **Import `05_website_orders.json`** as a new workflow.
   - On the **Google Sheets Trigger**: assign the trigger credential, then
     re-select the spreadsheet (currently the test sheet
     `16gYMBrM9a3pwRNIIKLkkBkLGb7C96alzHHTrqTJVbzA`) and the
     **Website Orders** tab.
   - Confirm both **Call:** nodes point at the right sub-workflows
     (Order → Invoice `3mhDUwqqkQKG2sXE`, Notify `OwMpoe36X7rPNj8l`).
3. **Add two n8n Variables:**

   | Variable | Value |
   |---|---|
   | `GS_WEBSITE_SPREADSHEET_ID` | `16gYMBrM9a3pwRNIIKLkkBkLGb7C96alzHHTrqTJVbzA` (test — repoint for prod) |
   | `GS_WEBSITE_ORDERS_SHEET` | `Website Orders` |

4. **Google Sheet:** on the **Website Orders** tab, add two header cells at
   the right end: **Invoice ID** and **Sync Status** (row 1). The Apps Script
   leaves them blank; n8n writes them back after invoicing.
5. **item_config tab:** paste the rows from `item_config_website.csv` under
   the existing rows (they match the website's exact item names). Rows with a
   blank `zoho_item_id` still invoice correctly (ad-hoc line at the website
   price + a [REVIEW] Slack note) — fill the ids in whenever those items get
   created in Zoho: Sisig Half/Full, Paksiw Half/Full, Caldereta, Chicken
   Curry, Sarsa 450g, Buko Pandan, Kakanin.
6. **Activate** workflow 05. Place a website test order → within ~1 min:
   draft invoice in Zoho (number = the BGN ref), Slack ping, Invoice ID +
   Sync Status on the row. Re-run the same row → idempotent skip.

## Production repoint (later)

Same as the form pipeline: change the trigger's spreadsheet in the 05 UI and
update `GS_WEBSITE_SPREADSHEET_ID`. The website side moves by editing the
`SPREADSHEET_ID` Script Property on the prod spreadsheet's Apps Script and the
`SHEETS_WEBAPP_URL`/`SECRET` env vars in Vercel.
