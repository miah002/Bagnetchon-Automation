const order = $('Resolve Contact').item.json;
const cfgRows = $('Load item_config').all().map((i) => i.json);

// Collapse all whitespace (incl. newlines, double spaces) and lowercase, so
// "Roasted  Lechon ..." matches "Roasted Lechon ..." and the multi-line
// lechon column header is irrelevant to matching.
const normalize = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const active = cfgRows.filter((r) => String(r.active ?? '').trim().toLowerCase() === 'true');

// Match on match_text ONLY — each menu option label is unique, and the
// sheet_column_header (especially the multi-line lechon one) is too fragile
// to require an exact match on.
const byText = new Map();
for (const r of active) byText.set(normalize(r.match_text), r);

const line_items = [];
const review = [];

for (const sel of order.selected_items) {
  const row = byText.get(normalize(sel.selected_text));

  if (!row) {
    const itemName = sel.selected_text || sel.sheet_column_header;
    review.push('no item_config match for "' + itemName + '"');
    line_items.push({
      name: itemName,
      rate: 0,
      quantity: 1,
      description: 'AD-HOC: no item_config match_text matched this selection',
    });
    continue;
  }

  const zohoItemId = String(row.zoho_item_id ?? '').trim();
  if (zohoItemId) {
    line_items.push({ item_id: zohoItemId, quantity: 1 });
  } else {
    const itemName = String(row.item_name ?? sel.selected_text).trim();
    const rate = Number(row.default_rate ?? 0) || 0;
    review.push('uncatalogued item "' + itemName + '" — zoho_item_id blank in item_config');
    line_items.push({
      name: itemName,
      rate,
      quantity: 1,
      description: 'AD-HOC: zoho_item_id blank in item_config',
    });
  }
}

if (line_items.length === 0) {
  throw new Error('No line items produced — check item_config or menu selections.');
}

return [{ json: { ...order, line_items, review } }];