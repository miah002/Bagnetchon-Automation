/**
 * Sub-workflow — "Build Line Items" Code node
 * ----------------------------------------------------------------------------
 * Joins the order's qty map against the `item_config` table to produce Zoho
 * line_items[]. Two cases:
 *
 *   - Config row has a non-empty `zoho_item_id`:
 *       → catalogued line: { item_id, quantity }
 *
 *   - Config row exists but `zoho_item_id` is blank
 *     (or no config row at all for that column):
 *       → ad-hoc line: { name, rate, quantity, description }
 *       → review flag appended so notes show "[REVIEW: uncatalogued item ...]"
 *
 * `item_config` columns (single source of truth — edit the sheet, not this code):
 *   sheet_column_header | zoho_item_id | item_name | active | default_rate
 *
 * `default_rate` is an OPTIONAL convenience column used only for the
 * uncatalogued / ad-hoc case so the draft has a non-zero starting price.
 * Leave it blank and you'll get rate=0 (still safe — it's a draft).
 */
const order = $('Resolve Contact').item.json;
const cfgRows = $('Load item_config').all().map(i => i.json);

const active = cfgRows.filter(r =>
  String(r.active ?? '').trim().toLowerCase() === 'true'
);
const byHeader = new Map(
  active.map(r => [String(r.sheet_column_header ?? '').trim(), r])
);

const line_items = [];
const review = [];

for (const [header, rawQty] of Object.entries(order.item_quantities)) {
  const qty = Number(rawQty);
  if (!Number.isFinite(qty) || qty <= 0) continue;

  const row = byHeader.get(header);

  if (!row) {
    // Sheet column with no item_config row at all.
    review.push(`no item_config row for column "${header}" (qty ${qty})`);
    line_items.push({
      name: header,
      rate: 0,
      quantity: qty,
      description: 'AD-HOC: no item_config row matched this column header',
    });
    continue;
  }

  const zohoItemId = String(row.zoho_item_id ?? '').trim();
  if (zohoItemId) {
    line_items.push({ item_id: zohoItemId, quantity: qty });
  } else {
    const itemName = String(row.item_name ?? header).trim();
    const rate = Number(row.default_rate ?? 0) || 0;
    review.push(`uncatalogued item "${itemName}" (qty ${qty}) — zoho_item_id is blank in item_config`);
    line_items.push({
      name: itemName,
      rate,
      quantity: qty,
      description: 'AD-HOC: zoho_item_id blank in item_config',
    });
  }
}

if (line_items.length === 0) {
  throw new Error('No line items produced — check item_config or the row qty columns.');
}

return [{ json: { ...order, line_items, review } }];
