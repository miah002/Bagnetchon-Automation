/**
 * Sub-workflow — "Build Invoice Payload" Code node
 * ----------------------------------------------------------------------------
 * Assembles the full Zoho Invoice create-request body from the contact id,
 * line items, and custom fields.
 *
 * Zoho custom fields are referenced by `label` here. The labels MUST match
 * what you create in:
 *   Zoho Invoice → Settings → Custom Fields → Invoices
 *
 *   Label                    Data type
 *   ----------------------   -------------
 *   cf_source_row_id         Single line
 *   cf_fulfillment_date      Date
 *   cf_fulfillment_type      Dropdown (Pickup, Delivery)
 *   cf_payment_method        Single line
 *
 * Invoice date = today (creation date). Fulfillment date is a custom field,
 * NOT the invoice date, per spec.
 */
const order = $('Build Line Items').item.json;

// Notes: combine the customer's special instructions with any uncatalogued
// item review flags so the draft is loud about anything needing attention.
const notes = [
  order.special_instructions || '',
  ...(order.review || []).map(r => `[REVIEW: uncatalogued item — ${r}]`),
]
  .filter(Boolean)
  .join('\n')
  .trim();

const payload = {
  customer_id: order.contact_id,
  date: new Date().toISOString().slice(0, 10),
  line_items: order.line_items,
  notes,
  custom_fields: [
    { label: 'cf_source_row_id',    value: order.source_row_id },
    { label: 'cf_fulfillment_date', value: order.fulfillment.date },
    { label: 'cf_fulfillment_type', value: order.fulfillment.type },
    { label: 'cf_payment_method',   value: order.payment_method },
  ],
};

if (order.fulfillment.address) {
  payload.shipping_address = { address: order.fulfillment.address };
}

return [{ json: { ...order, invoice_payload: payload } }];
