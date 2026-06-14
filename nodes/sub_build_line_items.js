const order = $('Resolve Contact').item.json;
const cfgRows = $('Load item_config').all().map(i => i.json);

const normalize = s => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const active = cfgRows.filter(r => String(r.active ?? '').trim().toLowerCase() === 'true');

const line_items = [];
const review = [];

for (const sel of order.selected_items) {
  const colHeader = String(sel.sheet_column_header ?? '').trim();
  const selNorm = normalize(sel.selected_text);

  const row = active.find(r =>
    normalize(r.sheet_column_header) === normalize(colHeader) &&
    normalize(r.match_text) === selNorm
  );

  if (!row) {
    const itemName = sel.selected_text || colHeader;
    review.push('no item_config match for "' + itemName + '"');
    line_items.push({
      name: itemName,
      rate: 0,
      quantity: 1,
      description: 'AD-HOC: no item_config row matched this selection',
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