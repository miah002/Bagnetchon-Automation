/**
 * Sub-workflow — "Exit Idempotent" Code node
 * ----------------------------------------------------------------------------
 * Reached when the existing-invoice GET returns a hit for this
 * source_row_id. We do NOT create anything; we just return a summary
 * pointing at the already-created invoice.
 */
const order = $('Validate Payload').item.json;
const existing = $('Check Existing Invoice').item.json.invoices?.[0] ?? null;

return [{
  json: {
    ok: true,
    idempotent: true,
    source: order.source,
    source_row_id: order.source_row_id,
    invoice_id: existing?.invoice_id ?? null,
    invoice_status: existing?.status ?? null,
    invoice_number: existing?.invoice_number ?? null,
    message: 'order already invoiced — skipped',
  },
}];
