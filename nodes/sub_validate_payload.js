const p = $('From Caller').item.json;
const errors = [];

if (!p || typeof p !== 'object') errors.push('payload is missing');
if (!p?.source) errors.push('source is missing');
if (!p?.source_row_id) errors.push('source_row_id is missing');
if (!p?.customer?.email && !p?.customer?.phone) {
  errors.push('need at least email or phone for contact dedupe');
}
if (!p?.customer?.name) errors.push('customer name is missing');
if (!Array.isArray(p?.selected_items) || p.selected_items.length === 0) {
  errors.push('no menu items selected');
}

if (errors.length) throw new Error('Invalid order payload: ' + errors.join('; '));
return [{ json: p }];