/**
 * Sub-workflow — "Return Summary" Code node
 * ----------------------------------------------------------------------------
 * Final node. Returns a small JSON summary to the calling workflow so the
 * intake can log or display it. Keep this lean — secrets must NEVER leak
 * back into the caller's context.
 */
const order = $('Build Invoice Payload').item.json;
const invoice = $('Create Draft Invoice')?.item?.json?.invoice ?? null;

return [{
  json: {
    ok: true,
    idempotent: false,
    source: order.source,
    source_row_id: order.source_row_id,
    contact_id: order.contact_id,
    contact_lookup: order.contact_lookup,
    invoice_id: invoice?.invoice_id ?? null,
    invoice_status: invoice?.status ?? 'draft',
    invoice_number: invoice?.invoice_number ?? null,
    review_flags: order.review ?? [],
  },
}];
