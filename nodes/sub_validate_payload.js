/**
 * Sub-workflow — "Validate Payload" Code node
 * ----------------------------------------------------------------------------
 * Defensive shape-check on the normalized order payload received from any
 * caller (the Google Sheet intake today, the Supabase intake later).
 *
 * On any missing required field, we THROW — n8n's "Error Workflow" setting
 * on this workflow routes that to the Notify sub-workflow.
 */
const p = $input.item.json;
const errors = [];

if (!p || typeof p !== 'object') errors.push('payload is missing');
if (!p?.source) errors.push('source is missing');
if (!p?.source_row_id) errors.push('source_row_id is missing');
if (!p?.customer?.email && !p?.customer?.phone) {
  errors.push('need at least email or phone for contact dedupe');
}
if (!p?.customer?.name) errors.push('customer name is missing');
if (!p?.item_quantities || Object.keys(p.item_quantities).length === 0) {
  errors.push('no item quantities supplied');
}

if (errors.length) {
  throw new Error('Invalid order payload: ' + errors.join('; '));
}

return [{ json: p }];
