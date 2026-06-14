#!/usr/bin/env node
/**
 * Local regression tests for the n8n Code-node logic.
 *
 * These run the ACTUAL jsCode pulled live from the workflow JSON against the
 * ACTUAL item_config.csv and the real submitted form row, inside a tiny mock
 * of the n8n runtime ($input / $ / $vars / require). No n8n instance needed.
 *
 *   node tests/node-logic.test.js
 *
 * Purpose: catch logic regressions (field renames, match_text drift, the
 * item_config fan-out bug, multi-select splitting) before they reach the
 * live workflow — the parts that don't depend on Google/Zoho being reachable.
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

// --- minimal RFC4180-ish CSV parser (handles quoted fields w/ newlines) ---
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows
    .filter((r) => r.some((v) => v !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const configRows = parseCsv(fs.readFileSync(path.join(ROOT, 'item_config.csv'), 'utf8'));

// --- mini n8n runtime ---
function runNode(code, { inputItem = {}, nodes = {}, vars = {} } = {}) {
  const $input = { item: { json: inputItem }, all: () => [{ json: inputItem }] };
  const $ = (name) => {
    if (!(name in nodes)) throw new Error(`mock: node "${name}" did not run`);
    const arr = Array.isArray(nodes[name]) ? nodes[name] : [nodes[name]];
    return { item: { json: arr[0] }, all: () => arr.map((j) => ({ json: j })) };
  };
  const fn = new Function('$input', '$', '$vars', 'require', code);
  return fn($input, $, vars, (m) => (m === 'crypto' ? crypto : require(m)));
}

const LECHON_HEADER = 'Bagnetchon Signature Menu -- \nHome of Premium Filipino Roasted Lechon';
const VARS = {
  GS_SPREADSHEET_ID: '10K7AyrIuwVTF-6OLqaK8I5K57kl-hJYZkU_FAD53cfU',
  GS_RESPONSES_SHEET: 'Form Responses 3',
};

const validRow = {
  'Timestamp': '2026-06-13T10:38:22.632Z',
  'Email Address': 'ulanjeremiah@yahoo.com',
  'What is your name?': 'Jeremiah',
  'What date, day and time do you need the food/service?': '06/20/2026',
  'Contact number or mobile (for confirmation & follow-up)': '09260690435',
  'What type of event are you planning?': 'Corporate Function',
  'Estimated number of guests attending:': 10,
  'Service Method ': 'Delivery',
  'Delivery location ': '065 purok ipil stb',
  [LECHON_HEADER]: 'Roasted  Lechon Belly 450g $25 per pack, Roasted Lechon Belly    (half rolls size) 8 lb.- 11 lb $120 - $160',
  'Column 17': 'Pork Siomai Full tray $250',
  'row_number': 2,
};

// --- tiny assert framework ---
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL:', m); } };

const C = {
  validateRow: nodeCode('01_main.json', 'Validate Row'),
  normalize: nodeCode('01_main.json', 'Normalize Order'),
  buildNotify: nodeCode('01_main.json', 'Build Notify Payload'),
  validatePayload: nodeCode('02_order_to_invoice.json', 'Validate Payload'),
  buildLineItems: nodeCode('02_order_to_invoice.json', 'Build Line Items'),
  buildInvoice: nodeCode('02_order_to_invoice.json', 'Build Invoice Payload'),
  formatMessage: nodeCode('03_notify.json', 'Format Message'),
};

console.log('\n[1] Validate Row — valid order');
const vr = runNode(C.validateRow, { inputItem: validRow })[0].json;
ok(vr.ok === true && vr.errors.length === 0, 'valid row passes');

console.log('\n[2] Validate Row — bad email + delivery w/o address');
const badRow = { ...validRow, 'Email Address': 'not-an-email', 'Delivery location ': '' };
const vrBad = runNode(C.validateRow, { inputItem: badRow })[0].json;
ok(vrBad.ok === false, 'bad row rejected');
ok(vrBad.errors.some((e) => /email/i.test(e)), 'flags bad email');
ok(vrBad.errors.some((e) => /delivery/i.test(e)), 'flags missing delivery address');

console.log('\n[3] Normalize Order — multi-select split');
const norm = runNode(C.normalize, { inputItem: { row: validRow }, vars: VARS })[0].json;
ok(norm.selected_items.length === 3, `3 selected items (got ${norm.selected_items.length})`);
ok(norm.customer.email === 'ulanjeremiah@yahoo.com', 'email lowercased');
ok(norm.fulfillment.type === 'Delivery' && norm.fulfillment.address === '065 purok ipil stb', 'fulfillment captured');
ok(/^gs:[0-9a-f]{16}$/.test(norm.source_row_id), 'stable hashed source_row_id');

console.log('\n[4] Validate Payload — accepts normalized order');
const vp = runNode(C.validatePayload, { nodes: { 'From Caller': norm } })[0].json;
ok(vp.selected_items.length === 3, 'payload valid');

console.log('\n[5] Build Line Items — match against item_config (no zoho_item_id yet)');
const order = { ...norm, contact_id: 'X', contact_lookup: 'matched_email' };
const bli = runNode(C.buildLineItems, { nodes: { 'Resolve Contact': order, 'Load item_config': configRows } })[0].json;
ok(bli.line_items.length === 3, `3 line items (got ${bli.line_items.length})`);
ok(bli.line_items.map((l) => l.name).includes('Roasted Lechon Belly 450g'), 'whitespace-tolerant match (double space)');
ok(bli.line_items.map((l) => l.name).includes('Roasted Lechon Belly Half Roll'), 'matched half roll');
ok(bli.line_items.map((l) => l.name).includes('Pork Siomai Full Tray'), 'matched pork siomai');
ok(bli.line_items.every((l) => l.quantity === 1), 'all qty=1');
ok(bli.line_items.every((l) => typeof l.rate === 'number' && l.rate > 0), 'rates from default_rate');
ok(bli.review.length === 3, 'all 3 flagged for review (zoho_item_id blank) — expected until catalog filled');

console.log('\n[6] Build Line Items — catalogued item uses item_id path');
const cfgWithId = configRows.map((r) =>
  r.match_text === 'Pork Siomai Full tray $250' ? { ...r, zoho_item_id: '99999' } : r);
const bli2 = runNode(C.buildLineItems, { nodes: { 'Resolve Contact': order, 'Load item_config': cfgWithId } })[0].json;
const siomai = bli2.line_items.find((l) => l.item_id === '99999');
ok(!!siomai, 'catalogued item emits item_id (no name/rate)');
ok(bli2.review.length === 2, 'review drops to 2 once one item is catalogued');

console.log('\n[7] Build Invoice Payload — shape');
const inv = runNode(C.buildInvoice, { nodes: { 'Build Line Items': { ...order, line_items: bli.line_items, review: bli.review } } })[0].json;
ok(inv.invoice_payload.customer_id === 'X', 'customer_id set');
ok(inv.invoice_payload.line_items.length === 3, 'line items carried');
ok(!!inv.invoice_payload.shipping_address, 'delivery → shipping_address present');
ok(/REVIEW/.test(inv.invoice_payload.notes), 'review flags surfaced in notes');
ok(inv.invoice_payload.custom_fields.some((c) => c.label === 'cf_source_row_id'), 'cf_source_row_id present');

console.log('\n[8] Validation-failure notify path');
const notify = runNode(C.buildNotify, { inputItem: vrBad })[0].json;
ok(notify.severity === 'error' && Array.isArray(notify.errors), 'notify payload built');
const msg = runNode(C.formatMessage, { inputItem: notify })[0].json;
ok(/Bagnetchon automation alert/.test(msg.text) && /email/i.test(msg.text), 'message formatted with errors');

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
