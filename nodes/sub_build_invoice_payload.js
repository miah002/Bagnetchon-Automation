const order = $('Build Line Items').item.json;

// Notes: combine the customer's special instructions with any uncatalogued
// item review flags so the draft is loud about anything needing attention.
const notes = [
  order.special_instructions || '',
  ...(order.review || []).map(r => '[REVIEW: uncatalogued item — ' + r + ']'),
]
  .filter(Boolean)
  .join('\n')
  .trim();

// Custom fields referenced by label. These MUST exist in:
//   Zoho Invoice → Settings → Custom Fields → Invoices
//   cf_source_row_id     (Single line)
//   cf_fulfillment_date  (Date)
//   cf_fulfillment_type  (Single line / Dropdown)
//   cf_event_type        (Single line)
const custom_fields = [
  { label: 'cf_source_row_id',    value: order.source_row_id },
  { label: 'cf_fulfillment_date', value: order.fulfillment?.date || '' },
  { label: 'cf_fulfillment_type', value: order.fulfillment?.type || '' },
];
if (order.fulfillment?.event_type) {
  custom_fields.push({ label: 'cf_event_type', value: order.fulfillment.event_type });
}

const payload = {
  customer_id: order.contact_id,
  date: new Date().toISOString().slice(0, 10),
  line_items: order.line_items,
  notes,
  custom_fields,
};

if (order.fulfillment?.address) {
  payload.shipping_address = { address: order.fulfillment.address };
}

return [{ json: { ...order, invoice_payload: payload } }];