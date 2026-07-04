#!/usr/bin/env node
/**
 * Local regression tests for the WEBSITE order path:
 *   05_website_orders.json  (Validate Website Row, Normalize Website Order)
 *   02_order_to_invoice.json (patched: qty/rate support, invoice_number_hint)
 *
 * Runs the ACTUAL jsCode pulled from the workflow JSONs inside the same mock
 * n8n runtime as node-logic.test.js. No n8n instance needed.
 *
 *   node tests/website-order.test.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const WF = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'workflows', f), 'utf8'));

function nodeCode(wfFile, nodeName) {
  const d = WF(wfFile);
  const n = d.nodes.find((x) => x.name === nodeName);
  if (!n) throw new Error(`node "${nodeName}" not found in ${wfFile}`);
  return n.parameters.jsCode;
}

// --- mini n8n runtime (same shape as node-logic.test.js) ---
function runNode(code, { inputItem = {}, inputItems = null, nodes = {}, vars = {}, staticData = {} } = {}) {
  const items = inputItems || [inputItem];
  const $input = { item: { json: items[0] }, all: () => items.map((j) => ({ json: j })) };
  const $ = (name) => {
    if (!(name in nodes)) throw new Error(`mock: node "${name}" did not run`);
    const arr = Array.isArray(nodes[name]) ? nodes[name] : [nodes[name]];
    return { item: { json: arr[0] }, all: () => arr.map((j) => ({ json: j })) };
  };
  const $getWorkflowStaticData = () => staticData;
  const fn = new Function('$input', '$', '$vars', 'require', '$getWorkflowStaticData', code);
  return fn($input, $, vars, (m) => (m === 'crypto' ? crypto : require(m)), $getWorkflowStaticData);
}

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL:', m); } };

const C = {
  validate: nodeCode('05_website_orders.json', 'Validate Website Row'),
  normalize: nodeCode('05_website_orders.json', 'Normalize Website Order'),
  validatePayload: nodeCode('02_order_to_invoice.json', 'Validate Payload'),
  buildIdempotencyKey: nodeCode('02_order_to_invoice.json', 'Build Idempotency Key'),
  buildLineItems: nodeCode('02_order_to_invoice.json', 'Build Line Items'),
};

const VARS = {
  GS_SPREADSHEET_ID: '10K7AyrIuwVTF-6OLqaK8I5K57kl-hJYZkU_FAD53cfU',
  GS_RESPONSES_SHEET: 'Form Responses 3',
  GS_WEBSITE_SPREADSHEET_ID: '16gYMBrM9a3pwRNIIKLkkBkLGb7C96alzHHTrqTJVbzA',
  GS_WEBSITE_ORDERS_SHEET: 'Website Orders',
};

// A row exactly as the site's Apps Script writes it (docs/integrations/
// google-sheet-orders.md in the brand-launch repo).
const websiteRow = {
  'Timestamp': '2026-07-04T16:20:00Z',
  'Order Ref': 'BGN-AB12CD34EF',
  'Name': 'Maria Santos',
  'Email': 'Maria.Santos@example.com',
  'Phone': '714-555-0101',
  'Fulfillment': 'delivery',
  'Address': '123 Palm St, Anaheim, CA 92801',
  'Items': '2× Beef Kare Kare — Full Tray @ $265; 1× Steamed Rice — Full Tray @ $80',
  'Subtotal': 610,
  'Tax': 47.28,
  'Delivery Fee': 0,
  'Total': 657.28,
  'Status': 'new',
  'Source': 'Website',
  'row_number': 5,
};

// item_config fixture: kare kare catalogued (real Zoho id), rice uncatalogued.
const itemConfig = [
  { sheet_column_header: 'website', match_text: 'Beef Kare Kare — Full Tray', item_name: 'Beef Kare Kara', zoho_item_id: '5729797000000388023', active: 'true', default_rate: 250 },
  { sheet_column_header: 'website', match_text: 'Steamed Rice — Full Tray', item_name: 'Steamed Rice Full Tray', zoho_item_id: '', active: 'true', default_rate: 80 },
];

console.log('\n[1] Validate Website Row');
const v = runNode(C.validate, { inputItem: websiteRow })[0].json;
ok(v.ok === true && v.errors.length === 0, 'valid website row passes');
const vBad = runNode(C.validate, { inputItem: { ...websiteRow, 'Order Ref': '', 'Email': 'nope' } })[0].json;
ok(vBad.ok === false && vBad.errors.some((e) => /order ref/i.test(e)), 'missing ref flagged');
ok(vBad.errors.some((e) => /email/i.test(e)), 'bad email flagged');
const vNoAddr = runNode(C.validate, { inputItem: { ...websiteRow, 'Address': 'Pickup' } })[0].json;
ok(vNoAddr.ok === false && vNoAddr.errors.some((e) => /address/i.test(e)), 'delivery without address flagged');

console.log('\n[2] Normalize Website Order');
const n = runNode(C.normalize, { inputItem: { row: websiteRow }, vars: VARS })[0].json;
ok(n.source === 'website' && n.source_row_id === 'web:BGN-AB12CD34EF', 'source + source_row_id from ref');
ok(n.invoice_number_hint === 'BGN-AB12CD34EF', 'invoice_number_hint = order ref');
ok(n.customer.email === 'maria.santos@example.com', 'email lowercased');
ok(n.selected_items.length === 2, `2 selected items (got ${n.selected_items.length})`);
ok(n.selected_items[0].qty === 2 && n.selected_items[0].rate === 265, 'qty 2 + rate 265 parsed');
ok(n.selected_items[0].selected_text === 'Beef Kare Kare — Full Tray', 'item name parsed clean');
ok(n.selected_items[1].qty === 1 && n.selected_items[1].rate === 80, 'second line qty 1 + rate 80');
ok(n.fulfillment.address === '123 Palm St, Anaheim, CA 92801', 'delivery address kept');
ok(n.writeback.sheet_name === 'Website Orders' && n.writeback.row_number === 5, 'writeback targets Website Orders tab');

const pickupRow = { ...websiteRow, 'Fulfillment': 'pickup', 'Address': 'Pickup' };
const nPickup = runNode(C.normalize, { inputItem: { row: pickupRow }, vars: VARS })[0].json;
ok(nPickup.fulfillment.address === null, 'pickup order has null address');

console.log('\n[3] Validate Payload (02) accepts website order');
const vp = runNode(C.validatePayload, { nodes: { 'From Caller': n } })[0].json;
ok(vp.source === 'website' && vp.selected_items.length === 2, 'website payload valid');

console.log('\n[4] Build Idempotency Key uses the ref');
const key = runNode(C.buildIdempotencyKey, { nodes: { 'Validate Payload': vp } })[0].json;
ok(key.expected_invoice_number === 'BGN-AB12CD34EF', `invoice number = ref (got ${key.expected_invoice_number})`);
ok(key.cf_source_row_id === 'web:BGN-AB12CD34EF', 'cf_source_row_id from payload');

console.log('\n[5] Build Idempotency Key without hint keeps form scheme');
const formLike = { ...vp };
delete formLike.invoice_number_hint;
formLike.customer = { ...vp.customer, name: 'Jeremiah Ulan' };
formLike.fulfillment = { ...vp.fulfillment, date: '06/20/2026' };
const keyForm = runNode(C.buildIdempotencyKey, { nodes: { 'Validate Payload': formLike } })[0].json;
ok(keyForm.expected_invoice_number === 'JU062026', `form scheme intact (got ${keyForm.expected_invoice_number})`);

console.log('\n[6] Build Line Items honors qty + website rate');
const resolved = { ...vp, contact_id: '999000111', contact_lookup: 'matched_name' };
const li = runNode(C.buildLineItems, {
  nodes: { 'Resolve Contact': resolved, 'Load item_config': itemConfig },
})[0].json;
ok(li.line_items.length === 2, '2 line items');
const kk = li.line_items[0];
ok(kk.item_id === '5729797000000388023' && kk.quantity === 2, 'catalogued line: item_id + qty 2');
ok(kk.rate === 265, 'website rate 265 overrides catalog (Zoho has 250)');
const rice = li.line_items[1];
ok(!rice.item_id && rice.name === 'Steamed Rice Full Tray' && rice.quantity === 1 && rice.rate === 80, 'uncatalogued line: ad-hoc name + website rate');
ok(li.review.length === 1 && /uncatalogued/.test(li.review[0]), 'uncatalogued item flagged for review only');

console.log('\n[7] Build Line Items — unmatched website item still bills the charged price');
const mystery = {
  ...vp,
  contact_id: '999000111',
  selected_items: [{ sheet_column_header: 'Items', selected_text: 'Brand New Dish — Full Tray', qty: 3, rate: 199 }],
};
const li2 = runNode(C.buildLineItems, {
  nodes: { 'Resolve Contact': mystery, 'Load item_config': itemConfig },
})[0].json;
ok(li2.line_items[0].rate === 199 && li2.line_items[0].quantity === 3, 'no-match line keeps website rate + qty');
ok(li2.review.some((r) => /no item_config match/.test(r)), 'no-match flagged for review');

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
