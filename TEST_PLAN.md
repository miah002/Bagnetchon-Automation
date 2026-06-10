# Test plan — Bagnetchon Order → Invoice

Run these in order. Steps 1–8 should pass with the **Create Draft
Invoice** and **Write back to Source Row** nodes still DISABLED — you
verify the payload shape from the n8n execution log. Then enable both
and run scenario 9 (real-Zoho end-to-end smoke).

For every scenario, the **expected** column refers to either:

- The execution viewer in n8n: open the run, click each node, inspect
  its output JSON.
- The notification channel (`#orders-automation` Slack room or
  `NOTIFY_EMAIL_TO` mailbox).

Pre-flight:

- [ ] Workflow 1 is **Active**.
- [ ] Workflows 2 + 3 are imported and wired into Workflow 1's
      "Call: ..." nodes.
- [ ] Workflow 2's **Workflow Settings → Error Workflow** is set to
      "Bagnetchon — Notify (sub)".
- [ ] At least one customer exists in Zoho with a known email and phone
      number (used in scenarios 4 + 5).
- [ ] `item_config` has at least one row with a real `zoho_item_id` and
      at least one row with `zoho_item_id` BLANK (used in scenario 6).
- [ ] A spare Google account / sheet edit lets you tweak the Timestamp
      column for the idempotency test.

---

## Scenario 1 — Single-item order, new customer

**Setup:** Submit the Form with:

- Email: `s1+single@example.test`
- Name: `Scenario 1`
- Contact: `+639170000001`
- Fulfillment Date: tomorrow, Type: `Pickup`, Address: (blank)
- Payment: `GCash`
- Lechon Belly (1kg): `1`, all other SKU cols: `0`

**Expected:**

- "Form Responses (Sheet)" trigger fires within ~1 min.
- "Validate Row" → `ok: true`.
- "Normalize Order" output has `item_quantities: { "Lechon Belly (1kg)": 1 }`.
- Sub-workflow runs through to "Build Invoice Payload":
  - `customer_id` set to a freshly created Zoho contact id.
  - `line_items` contains exactly one entry with `item_id` matching
    `item_config` and `quantity: 1`.
  - `custom_fields` includes `cf_source_row_id`, `cf_fulfillment_date`,
    `cf_fulfillment_type: Pickup`, `cf_payment_method: GCash`.
  - `shipping_address` is NOT present.
- No notification fires.

---

## Scenario 2 — Multi-item order

**Setup:** Submit the Form with:

- Email: `s2+multi@example.test`
- Name: `Scenario 2`
- Lechon Belly (1kg): `2`, Bagnet (1kg): `1`, Whole Lechon (~10kg): `0`
- Pickup, no address

**Expected:**

- "Build Line Items" produces TWO entries with correct `item_id`s and
  quantities 2 and 1.
- One invoice payload (not two).
- `review_flags` is empty assuming all SKU columns have catalogued
  `zoho_item_id`s.

---

## Scenario 3 — New customer (no Zoho match)

**Setup:** Submit with a brand-new email + phone that you've never used
in Zoho before.

**Expected:**

- "Find Contact by Email" returns `{ contacts: [] }` → IF FALSE branch.
- "Find Contact by Phone" returns `{ contacts: [] }` → IF FALSE branch.
- "Build Create-Contact Body" + "Create Contact" run.
- "Resolve Contact" output: `contact_lookup: "created"`.
- New contact visible in Zoho Invoice → Contacts.

---

## Scenario 4 — Returning customer (email match)

**Setup:** Submit with the email of an EXISTING Zoho contact. Use a
different name / phone to prove the email is what matched.

**Expected:**

- "Find Contact by Email" returns 1+ contacts.
- "Has Email Match?" → TRUE.
- "Resolve Contact" output: `contact_lookup: "matched_email"`,
  `contact_id` = the existing contact's id.
- "Find Contact by Phone" and "Create Contact" are SKIPPED (greyed in
  the execution view).

---

## Scenario 5 — Phone-fallback match

**Setup:** Submit with a NEW email but the phone number of an existing
Zoho contact.

**Expected:**

- "Find Contact by Email" returns empty.
- "Has Email Match?" → FALSE.
- "Find Contact by Phone" returns 1+ contacts.
- "Has Phone Match?" → TRUE.
- "Resolve Contact" output: `contact_lookup: "matched_phone"`,
  `contact_id` = the existing contact's id.
- No new contact created.

---

## Scenario 6 — Uncatalogued item (zoho_item_id blank)

**Setup:** In `item_config`, blank out `zoho_item_id` for one SKU (set
a `default_rate` like `500`). Submit a Form order with qty 1 for that
SKU.

**Expected:**

- "Build Line Items" emits a line WITHOUT `item_id`, with `name`,
  `rate: 500`, `quantity: 1`, `description: "AD-HOC: zoho_item_id blank ..."`.
- `review_flags` contains an entry naming the uncatalogued item.
- "Build Invoice Payload" `notes` includes
  `[REVIEW: uncatalogued item — uncatalogued item "<name>" ...]`.

---

## Scenario 7 — Malformed row (bad email)

**Setup:** Submit a Form response with an obviously broken email
(e.g. `not-an-email`) OR an empty Name field.

**Expected:**

- "Validate Row" → `ok: false`, `errors: ["email format looks wrong"]`
  (or similar).
- "Valid?" routes to FALSE branch.
- "Build Notify Payload" → "Call: Notify (validation failure)".
- Notification arrives on the configured channel with the row dumped
  and the error.
- Workflow 2 is NEVER called.

---

## Scenario 8 — Re-run / idempotency

**Setup:** Take a row that was already invoiced. In the n8n executions
view, click **Re-run from start** on that execution. (Or copy the row
to the bottom of the sheet without changing Timestamp + Email — the
hash will match.)

**Expected:**

- "Check Existing Invoice" returns the previously created invoice.
- "Already Invoiced?" → TRUE.
- "Exit Idempotent" runs. Summary output:
  `{ ok: true, idempotent: true, invoice_id: "<existing>", message: "order already invoiced — skipped" }`.
- No new Zoho invoice. No write-back to the sheet (Update node is on
  the success branch, not the idempotent branch).

---

## Scenario 9 — Pickup with no address (success boundary)

**Setup:** Submit with Type `Pickup`, Address left blank.

**Expected:**

- "Validate Row" → `ok: true` (address is NOT required for Pickup).
- "Build Invoice Payload" output has NO `shipping_address` key at all.
- Invoice creates cleanly in Zoho without a shipping address.

Reciprocal: submit Type `Delivery` with blank Address →
"Validate Row" → `ok: false`, error
`"delivery address is required for Delivery orders"` → notification.

---

## End-to-end smoke (after enabling the two disabled nodes)

After scenarios 1–8 verify the workflow's structure, in Workflow 2:

1. Right-click **Create Draft Invoice** → **Activate**.
2. Right-click **Write back to Source Row** → **Activate**.
3. Save the workflow.
4. Re-run Scenario 1 end-to-end. Verify:
   - A new draft invoice exists in Zoho Invoice → Invoices, status
     `Draft`.
   - Its custom field `cf_source_row_id` matches the source row's
     hash.
   - The Form Responses sheet row gets `Invoice ID` and `Sync Status:
     draft` written back.
   - Re-running the same execution still hits scenario 8's idempotent
     branch.

If any of those three fail, disable the two nodes again and capture
the n8n execution JSON before debugging.
