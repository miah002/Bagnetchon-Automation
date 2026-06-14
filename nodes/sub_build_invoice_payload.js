const order = $('Build Line Items').item.json;

// Event + guest context goes in notes (no spare custom-field slot: plan allows 3).
const f = order.fulfillment || {};
const ctx = [];
if (f.event_type) ctx.push('Event: ' + f.event_type);
if (f.guest_count) ctx.push('Guests: ' + f.guest_count);

const notes = [
  ctx.join(' | '),
  order.special_instructions || '',
  ...(order.review || []).map((r) => '[REVIEW: uncatalogued item — ' + r + ']'),
]
  .filter(Boolean)
  .join('\n')
  .trim();

// Only 3 custom fields (Zoho plan limit). These MUST exist in
//   Zoho Invoice → Settings → Custom Fields → Invoices  (named exactly):
//   cf_source_row_id     (Text, single line)  <- idempotency key
//   cf_fulfillment_date  (Text, single line)
//   cf_fulfillment_type  (Text, single line)
const custom_fields = [
  { label: 'cf_source_row_id',    value: order.source_row_id },
  { label: 'cf_fulfillment_date', value: f.date || '' },
  { label: 'cf_fulfillment_type', value: f.type || '' },
];

const payload = {
  customer_id: order.contact_id,
  date: new Date().toISOString().slice(0, 10),
  line_items: order.line_items,
  notes,
  custom_fields,
};

if (f.address) {
  payload.shipping_address = { address: f.address };
}

return [{ json: { ...order, invoice_payload: payload } }];