const order = $('Build Line Items').item.json;
const c = order.customer || {};
const f = order.fulfillment || {};

// Order-summary block (mirrors the "Subject" section of the manual invoices).
// Zoho's invoice create API has no writable Subject field, so this renders in
// Notes — the reliable place that always shows on the invoice/PDF.
const summary = [
  'ORDER SUMMARY',
  c.name ? 'Name: ' + c.name : '',
  f.date ? 'Date/Time: ' + f.date : '',
  c.phone ? 'Phone: ' + c.phone : '',
  c.email ? 'Email: ' + c.email : '',
  f.type ? 'Service: ' + f.type : '',
  f.address ? 'Delivery location: ' + f.address : '',
  (f.event_type || f.guest_count)
    ? ('Event: ' + (f.event_type || '') + (f.guest_count ? (' | Guests: ' + f.guest_count) : ''))
    : '',
].filter(Boolean).join('\n');

const notes = [
  summary,
  order.special_instructions ? '\n' + order.special_instructions : '',
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
  // Short reference shown near the top of the invoice.
  reference_number: order.source_row_id,
  line_items: order.line_items,
  notes,
  custom_fields,
};

if (f.address) {
  payload.shipping_address = { address: f.address };
}

return [{ json: { ...order, invoice_payload: payload } }];