/**
 * Main workflow — "Validate Row" Code node
 * ----------------------------------------------------------------------------
 * Input  : one item from the Google Sheets Trigger (one new Form response row).
 *          The row's keys are exactly the column headers from row 1 of the sheet.
 * Output : { ok: boolean, row: <original>, errors: string[] }
 *
 * Checks:
 *   1. Email is present and shaped like an email address.
 *   2. Name is present.
 *   3. Fulfillment Date is present and parseable.
 *   4. Fulfillment Type is "Pickup" or "Delivery".
 *   5. If Delivery, Delivery Address is non-empty.
 *   6. At least one SKU quantity column is > 0.
 *
 * IMPORTANT: This Code node does NOT hard-code the SKU column names.
 * Everything that is not in the META set below is treated as a candidate
 * SKU column. To add a menu item to the Form, you add a column to the sheet
 * AND a row to `item_config` — you do NOT edit this Code node.
 */
const row = $input.item.json;
const errors = [];

const email = String(row['Email'] ?? row['Email Address'] ?? '').trim();
if (!email) {
  errors.push('email is missing');
} else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  errors.push('email format looks wrong');
}

const name = String(row['Name'] ?? '').trim();
if (!name) errors.push('name is missing');

const fulfillmentDate = String(row['Fulfillment Date'] ?? '').trim();
if (!fulfillmentDate) {
  errors.push('fulfillment date is missing');
} else if (Number.isNaN(Date.parse(fulfillmentDate))) {
  errors.push('fulfillment date is not a valid date');
}

const fulfillmentType = String(row['Fulfillment Type'] ?? '').trim();
if (!['Pickup', 'Delivery'].includes(fulfillmentType)) {
  errors.push('fulfillment type must be "Pickup" or "Delivery"');
}

const address = String(row['Delivery Address'] ?? '').trim();
if (fulfillmentType === 'Delivery' && !address) {
  errors.push('delivery address is required for Delivery orders');
}

// META = column headers we treat as customer / order metadata, NOT SKU quantities.
// Adding a new SKU column to the sheet does not require editing this set.
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
  'row_number',                    // injected by the Google Sheets Trigger
  'Invoice ID', 'Sync Status',     // write-back columns (round-tripped after sync)
]);

let totalQty = 0;
for (const [k, v] of Object.entries(row)) {
  if (META.has(k)) continue;
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) totalQty += n;
}
if (totalQty <= 0) errors.push('no item quantities greater than zero');

return [{ json: { ok: errors.length === 0, row, errors } }];
