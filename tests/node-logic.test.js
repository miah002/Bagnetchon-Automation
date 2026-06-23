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
  cacheLookup: nodeCode('02_order_to_invoice.json', 'Contact Cache Lookup'),
  resolveContact: nodeCode('02_order_to_invoice.json', 'Resolve Contact'),
  buildSuccessNotify: nodeCode('01_main.json', 'Build Success Notify'),
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

console.log('\n[5] Build Line Items — catalogued item_config (zoho_item_id filled)');
const order = { ...norm, contact_id: 'X', contact_lookup: 'matched_email' };
const bli = runNode(C.buildLineItems, { nodes: { 'Resolve Contact': order, 'Load item_config': configRows } })[0].json;
const allCatalogued = configRows.every((r) => String(r.zoho_item_id || '').trim());
ok(bli.line_items.length === 3, `3 line items (got ${bli.line_items.length})`);
ok(bli.line_items.every((l) => l.quantity === 1), 'all qty=1');
if (allCatalogued) {
  ok(bli.line_items.every((l) => l.item_id && !l.name), 'catalogued: all lines use item_id');
  ok(bli.review.length === 0, 'no review flags when fully catalogued');
} else {
  ok(bli.line_items.some((l) => l.name && l.rate > 0), 'ad-hoc lines carry name+rate');
  ok(bli.review.length > 0, 'uncatalogued items flagged for review');
}

console.log('\n[6] Build Line Items — blank zoho_item_id falls back to ad-hoc');
const cfgBlank = configRows.map((r) =>
  r.match_text === 'Pork Siomai Full tray $250' ? { ...r, zoho_item_id: '' } : r);
const bli2 = runNode(C.buildLineItems, { nodes: { 'Resolve Contact': order, 'Load item_config': cfgBlank } })[0].json;
const siomaiAdhoc = bli2.line_items.find((l) => l.name === 'Pork Siomai Full Tray');
ok(!!siomaiAdhoc && siomaiAdhoc.rate === 250, 'blank id → ad-hoc line with default_rate');
ok(bli2.review.some((r) => /Pork Siomai/.test(r)), 'blanked item flagged for review');

console.log('\n[7] Build Invoice Payload — shape');
const inv = runNode(C.buildInvoice, { nodes: { 'Build Line Items': { ...order, line_items: bli.line_items, review: bli.review } } })[0].json;
ok(inv.invoice_payload.customer_id === 'X', 'customer_id set');
ok(inv.invoice_payload.line_items.length === 3, 'line items carried');
ok(!!inv.invoice_payload.shipping_address, 'delivery → shipping_address present');
ok(inv.invoice_payload.custom_fields.some((c) => c.label === 'cf_source_row_id'), 'cf_source_row_id present');
ok(/Event:/.test(inv.invoice_payload.notes), 'event/guests in notes');

console.log('\n[10] Social-media question is NOT treated as a menu item');
const socialRow = { ...validRow, '“On which social media platform was the advertisement seen?”': 'Facebook' };
const normSocial = runNode(C.normalize, { inputItem: { row: socialRow }, vars: VARS })[0].json;
ok(!normSocial.selected_items.some((s) => /facebook/i.test(s.selected_text)), 'social answer excluded from line items');
const vrSocial = runNode(C.validateRow, { inputItem: socialRow })[0].json;
ok(vrSocial.ok === true, 'social answer does not count as a menu selection for validation');

console.log('\n[8] Validation-failure notify path');
const notify = runNode(C.buildNotify, { inputItem: vrBad })[0].json;
ok(notify.severity === 'error' && Array.isArray(notify.errors), 'notify payload built');
const msg = runNode(C.formatMessage, { inputItem: notify })[0].json;
ok(/Bagnetchon automation alert/.test(msg.text) && /email/i.test(msg.text), 'message formatted with errors');

console.log('\n[9] Multi-row — two orders in one execution both processed');
const rowB = {
  ...validRow,
  'Timestamp': '2026-06-14T07:11:37.000Z',
  'Email Address': 'jeremiah.qryde@gmail.com',
  'What is your name?': 'Test Miah',
  'Contact number or mobile (for confirmation & follow-up)': 123456789,
  [LECHON_HEADER]: 'Roasted Cochinillo 12 -15 lbs. $450',
  'Column 17': '',
  'Column 11': 'Shanghai Rolls- Full tray $180 in',
};
const vrMulti = runNode(C.validateRow, { inputItems: [validRow, rowB] });
ok(vrMulti.length === 2, `Validate Row returns 2 items (got ${vrMulti.length})`);
ok(vrMulti.every((x) => x.json.ok), 'both rows valid');
const normMulti = runNode(C.normalize, { inputItems: [{ row: validRow }, { row: rowB }], vars: VARS });
ok(normMulti.length === 2, `Normalize returns 2 orders (got ${normMulti.length})`);
ok(normMulti[1].json.customer.name === 'Test Miah', 'second row (Test Miah) not dropped');
ok(normMulti[0].json.source_row_id !== normMulti[1].json.source_row_id, 'distinct source_row_ids');

console.log('\n[11] Same-batch contact dedupe — cache lookup + Resolve Contact');
// Shared static data simulates one trigger poll processing two orders for the
// SAME new customer (mode:each runs the sub sequentially in one parent run).
const sd = {};
const payloadA = { source: 'google_sheet', source_row_id: 'gs:aaa', customer: { email: 'New@Buyer.com', name: 'New Buyer', phone: '111' }, selected_items: [] };
const payloadB = { ...payloadA, source_row_id: 'gs:bbb' };

// Order A: cache empty → miss → falls to create branch → Resolve writes cache.
const lookupA = runNode(C.cacheLookup, { nodes: { 'Validate Payload': payloadA }, staticData: sd })[0].json;
ok(lookupA._cache_hit === false, 'order A: cache miss (no prior contact)');
const resolvedA = runNode(C.resolveContact, {
  nodes: { 'Validate Payload': payloadA, 'Contact Cache Lookup': lookupA, 'Create Contact': { contact: { contact_id: 'CID-NEW' } } },
  staticData: sd,
})[0].json;
ok(resolvedA.contact_id === 'CID-NEW' && resolvedA.contact_lookup === 'created', 'order A: created contact');
ok(sd.contactCache && sd.contactCache['new@buyer.com']?.contact_id === 'CID-NEW', 'order A: contact cached by lowercased email');

// Order B: same email, cache now warm → hit → reuse, NO create branch.
const lookupB = runNode(C.cacheLookup, { nodes: { 'Validate Payload': payloadB }, staticData: sd })[0].json;
ok(lookupB._cache_hit === true && lookupB._cache_contact_id === 'CID-NEW', 'order B: cache hit reuses contact');
const resolvedB = runNode(C.resolveContact, {
  nodes: { 'Validate Payload': payloadB, 'Contact Cache Lookup': lookupB },
  staticData: sd,
})[0].json;
ok(resolvedB.contact_id === 'CID-NEW' && resolvedB.contact_lookup === 'cache', 'order B: resolved from cache, no duplicate created');

// Stale entry (older than TTL) is ignored.
const sdStale = { contactCache: { 'new@buyer.com': { contact_id: 'OLD', ts: Date.now() - 6 * 60 * 1000 } } };
const lookupStale = runNode(C.cacheLookup, { nodes: { 'Validate Payload': payloadA }, staticData: sdStale })[0].json;
ok(lookupStale._cache_hit === false, 'stale cache entry (>5min) ignored');

console.log('\n[12] Success notify — only newly created invoices ping Slack, with order detail');
const summaries = [
  { ok: true, idempotent: false, source: 'google_sheet', source_row_id: 'gs:a', invoice_id: '1', invoice_number: 'INV-1', customer_name: 'Alice', total: 1280, currency: 'USD', contact_lookup: 'matched_email', review_flags: [] },
  { ok: true, idempotent: true,  source: 'google_sheet', source_row_id: 'gs:b', invoice_id: '2', invoice_number: 'INV-2', customer_name: 'Bob', total: 500, currency: 'USD' }, // skipped — re-run
  { ok: true, idempotent: false, source: 'google_sheet', source_row_id: 'gs:c', invoice_id: null, customer_name: 'Carol' }, // skipped — no invoice
  { ok: true, idempotent: false, source: 'google_sheet', source_row_id: 'gs:d', invoice_id: '3', invoice_number: 'INV-3', customer_name: 'Dave', total: 90, currency: 'USD', contact_lookup: 'created', review_flags: ['uncatalogued item "X"'] },
];
const normalizedOrders = [
  { source_row_id: 'gs:a', customer: { name: 'Alice', phone: '0917', email: 'alice@x.com' }, fulfillment: { date: '06/20/2026 4PM', type: 'Delivery', address: 'LA', event_type: 'Birthday', guest_count: 50 }, selected_items: [{ selected_text: 'Roasted Lechon Belly 450g $25 per pack' }, { selected_text: 'Pork Siomai Full tray $250' }] },
  { source_row_id: 'gs:d', customer: { name: 'Dave', phone: '0918', email: 'dave@x.com' }, fulfillment: { date: '07/01/2026', type: 'Pickup', address: 'should-be-hidden', event_type: '', guest_count: null }, selected_items: [{ selected_text: 'Steamed Rice Full tray $90' }] },
];
const notifies = runNode(C.buildSuccessNotify, { inputItems: summaries, nodes: { 'Normalize Order': normalizedOrders } }).map((i) => i.json);
ok(notifies.length === 2, `only created invoices notify (got ${notifies.length}, expected 2)`);
ok(notifies.every((n) => n.severity === 'info' && n.stage === 'invoice-created'), 'success payloads are info/invoice-created');
ok(notifies[0].fields.invoice === 'INV-1' && notifies[0].fields.customer === 'Alice' && notifies[0].fields.total === 'USD 1280', 'fields carry invoice/customer/total');
ok(notifies[0].fields.phone === '0917' && notifies[0].fields.date === '06/20/2026 4PM' && notifies[0].fields.service === 'Delivery', 'fields carry phone/date/service from normalized order');
ok(notifies[0].fields.location === 'LA' && /Birthday \(50 guests\)/.test(notifies[0].fields.event), 'delivery location + event/guests included');
ok(/Roasted Lechon Belly/.test(notifies[0].fields.items) && /Pork Siomai/.test(notifies[0].fields.items), 'ordered items listed');
ok(!('location' in notifies[1].fields), 'pickup order omits delivery location');
ok(notifies[1].review.length === 1, 'review flags carried into success ping');

const okMsg = runNode(C.formatMessage, { inputItem: notifies[0] })[0].json;
ok(/Bagnetchon — new invoice/.test(okMsg.text), 'success message uses new-invoice header (not alert)');
ok(/invoice: INV-1/.test(okMsg.text) && /customer: Alice/.test(okMsg.text) && /items: /.test(okMsg.text), 'success message renders enriched fields');

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
