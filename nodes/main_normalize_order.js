/**
 * Main workflow — "Normalize Order" Code node
 * ----------------------------------------------------------------------------
 * Converts the validated sheet row into the NORMALIZED ORDER payload that
 * the "Order → Invoice" sub-workflow accepts. This is the boundary contract
 * shared between the Google Sheet intake (today) and the future Supabase
 * form intake — both produce this same shape.
 *
 * Normalized order shape:
 * {
 *   source: 'google_sheet' | 'supabase_form',
 *   source_row_id: '<source-prefix>:<stable-id>',
 *   customer: { email, name, phone },
 *   fulfillment: { date, type, address },
 *   payment_method, special_instructions,
 *   item_quantities: { '<sheet_column_header>': <number> },
 *   writeback: { kind, ...intake-specific }
 * }
 */
const crypto = require('crypto');
const row = $input.item.json.row;

const email = String(row['Email'] ?? row['Email Address'] ?? '').trim().toLowerCase();
const timestamp = String(row['Timestamp'] ?? '').trim();

// Stable id: hash of (timestamp + email). Survives row reorders / re-runs.
const idHash = crypto
  .createHash('sha256')
  .update(timestamp + '|' + email)
  .digest('hex')
  .slice(0, 16);

const META = new Set([
  'Timestamp',
  'Email', 'Email Address',
  'Name',
  'Contact Number', 'Phone',
  'Fulfillment Date',
  'Fulfillment Type',
  'Delivery Address',
  'Payment Method',
  'Special Instructions',
  'row_number',
  'Invoice ID', 'Sync Status',
]);

const item_quantities = {};
for (const [k, v] of Object.entries(row)) {
  if (META.has(k)) continue;
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) item_quantities[k] = n;
}

const address = String(row['Delivery Address'] ?? '').trim();

const payload = {
  source: 'google_sheet',
  source_row_id: `gs:${idHash}`,
  customer: {
    email,
    name: String(row['Name'] ?? '').trim(),
    phone: String(row['Contact Number'] ?? row['Phone'] ?? '').trim(),
  },
  fulfillment: {
    date: String(row['Fulfillment Date'] ?? '').trim(),
    type: String(row['Fulfillment Type'] ?? '').trim(),
    address: address || null,
  },
  payment_method: String(row['Payment Method'] ?? '').trim(),
  special_instructions: String(row['Special Instructions'] ?? '').trim(),
  item_quantities,
  writeback: {
    kind: 'google_sheet',
    spreadsheet_id: $env.GS_SPREADSHEET_ID,
    sheet_name: $env.GS_RESPONSES_SHEET,
    row_number: row.row_number ?? null,
  },
};

return [{ json: payload }];
