#!/usr/bin/env python3
"""Generate workflows/05_website_orders.json.

Website orders land in the "Website Orders" tab (written by the site's Apps
Script). This workflow mirrors 01_main's shape — validate, normalize, call the
existing Order -> Invoice and Notify sub-workflows — but understands the
website row format: real quantities and server-computed unit prices in the
Items column, and the order ref reused as the deterministic invoice number.

Run:  python scripts/build_05_website_orders.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "workflows", "05_website_orders.json")

ORDER_TO_INVOICE_ID = "3mhDUwqqkQKG2sXE"
NOTIFY_ID = "OwMpoe36X7rPNj8l"
# The user's current TEST spreadsheet (Apps Script writes Website Orders here).
# Re-select in the n8n UI when repointing to production.
SPREADSHEET_ID = "16gYMBrM9a3pwRNIIKLkkBkLGb7C96alzHHTrqTJVbzA"

VALIDATE = r"""// Runs on ALL rows the trigger emits. Website rows are machine-written by the
// site's Apps Script, so validation guards against manual edits / half rows,
// not user typos (the website already validated the customer's input).
return $input.all().map((entry) => {
  const row = entry.json;
  const errors = [];

  const ref = String(row['Order Ref'] ?? '').trim();
  if (!ref) errors.push('Order Ref is missing');

  const email = String(row['Email'] ?? '').trim();
  if (!email) errors.push('email is missing');
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('email format looks wrong');

  const name = String(row['Name'] ?? '').trim();
  if (!name) errors.push('name is missing');

  const items = String(row['Items'] ?? '').trim();
  if (!items) errors.push('no items on the order');

  const fulfillment = String(row['Fulfillment'] ?? '').trim();
  if (fulfillment.toLowerCase() === 'delivery') {
    const addr = String(row['Address'] ?? '').trim();
    if (!addr || addr.toLowerCase() === 'pickup') errors.push('delivery order has no address');
  }

  return { json: { ok: errors.length === 0, row, errors } };
});"""

NORMALIZE = r"""// Maps a "Website Orders" row into the SAME normalized payload 01_main
// produces, so the existing Order -> Invoice sub-workflow is reused unchanged.
// Website extras the sub understands (see patched 02):
//   selected_items[].qty / .rate  — real quantities + server-computed prices
//                                    parsed from "2× Beef Kare Kare @ $265"
//   invoice_number_hint           — the order ref; keeps two same-day orders
//                                    from one customer from colliding on the
//                                    initials+date invoice number
return $input.all().map((entry) => {
  const row = entry.json.row;
  const ref = String(row['Order Ref'] ?? '').trim();

  const selected_items = String(row['Items'] ?? '')
    .split(/;\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(\d+)\s*[×x]\s*(.+?)(?:\s*@\s*\$?([\d.]+))?$/);
      if (!m) return { sheet_column_header: 'Items', selected_text: part, qty: 1 };
      const item = {
        sheet_column_header: 'Items',
        selected_text: m[2].trim(),
        qty: Math.max(1, parseInt(m[1], 10) || 1),
      };
      if (m[3] != null) item.rate = Number(m[3]);
      return item;
    });

  const fulfillmentType = String(row['Fulfillment'] ?? '').trim() || 'delivery';
  const isPickup = /pick.?up/i.test(fulfillmentType);
  const address = String(row['Address'] ?? '').trim();

  return { json: {
    source: 'website',
    source_row_id: 'web:' + ref,
    invoice_number_hint: ref,
    customer: {
      email: String(row['Email'] ?? '').trim().toLowerCase(),
      name: String(row['Name'] ?? '').trim(),
      phone: String(row['Phone'] ?? '').trim(),
    },
    fulfillment: {
      date: String(row['Timestamp'] ?? '').trim(),
      type: fulfillmentType,
      address: (!isPickup && address && address.toLowerCase() !== 'pickup') ? address : null,
      event_type: '',
      guest_count: null,
    },
    selected_items,
    order_totals: {
      subtotal: Number(row['Subtotal']) || 0,
      tax: Number(row['Tax']) || 0,
      delivery_fee: Number(row['Delivery Fee']) || 0,
      total: Number(row['Total']) || 0,
    },
    writeback: {
      kind: 'google_sheet',
      spreadsheet_id: $vars.GS_WEBSITE_SPREADSHEET_ID || $vars.GS_SPREADSHEET_ID,
      sheet_name: $vars.GS_WEBSITE_ORDERS_SHEET || 'Website Orders',
      row_number: row.row_number ?? null,
    },
  }};
});"""

SUCCESS_NOTIFY = r"""// Ping Slack for EVERY website order that has an invoice — newly created OR
// already existing (idempotent re-run). Rows that produced no invoice go to
// the failure path. Enrich with the order detail from the normalized payload.
const orders = $('Normalize Website Order').all().map((i) => i.json);
const byId = new Map(orders.map((o) => [o.source_row_id, o]));

return $input.all()
  .map((e) => e.json)
  .filter((s) => s && s.ok === true && s.invoice_id)
  .map((s) => {
    const o = byId.get(s.source_row_id) || {};
    const c = o.customer || {};
    const f = o.fulfillment || {};
    const items = (o.selected_items || [])
      .map((x) => (x.qty > 1 ? x.qty + '× ' : '') + x.selected_text)
      .filter(Boolean);
    const existed = s.idempotent === true;

    const fields = {};
    fields.invoice = (s.invoice_number || s.invoice_id) + (existed ? ' (already invoiced)' : '');
    fields.customer = s.customer_name || c.name || '(unknown)';
    if (c.phone) fields.phone = c.phone;
    if (c.email) fields.email = c.email;
    if (f.type) fields.service = f.type;
    if (f.address) fields.location = f.address;
    if (items.length) fields.items = items.join(', ');
    const t = o.order_totals || {};
    fields.total = (s.total != null) ? ((s.currency ? s.currency + ' ' : '') + s.total)
      : (t.total ? '$' + t.total : '(n/a)');

    return { json: {
      severity: 'info',
      stage: existed ? 'invoice-exists' : 'invoice-created',
      source: 'website',
      fields,
      review: Array.isArray(s.review_flags) ? s.review_flags : [],
    } };
  });"""

FAILURE_NOTIFY = r"""// Ping Slack for any website order that FAILED to produce an invoice — soft
// failures (sub returned ok:false) AND hard sub crashes (continueOnFail items
// carrying `error`). Idempotent skips and successes are filtered out.
const orders = $('Normalize Website Order').all().map((i) => i.json);
const byId = new Map(orders.map((o) => [o.source_row_id, o]));

return $input.all()
  .map((e) => e.json)
  .filter((s) => {
    if (!s) return false;
    if (s.error) return true;
    if (s.ok === true) return false;
    return true;
  })
  .map((s) => {
    const o = byId.get(s.source_row_id) || {};
    const c = o.customer || {};
    const f = o.fulfillment || {};
    const items = (o.selected_items || [])
      .map((x) => (x.qty > 1 ? x.qty + '× ' : '') + x.selected_text)
      .filter(Boolean);

    const fields = {};
    fields.customer = s.customer_name || c.name || '(unknown)';
    if (c.phone) fields.phone = c.phone;
    if (c.email) fields.email = c.email;
    if (f.type) fields.service = f.type;
    if (f.address) fields.location = f.address;
    if (items.length) fields.items = items.join(', ');

    const reason = (s.error && (s.error.message || s.error)) || s.message || 'invoice not created';

    return { json: {
      severity: 'error',
      stage: 'invoice-failed',
      source: 'website',
      errors: [String(reason)],
      fields,
    } };
  });"""

VALIDATION_FAIL_NOTIFY = r"""// Build a notify payload for EACH failed row.
return $input.all().map((entry) => {
  const v = entry.json;
  return { json: {
    severity: 'error',
    stage: 'website-intake-validation',
    source: 'website',
    errors: v.errors || ['unknown validation failure'],
    row: v.row,
  }};
});"""


def code_node(name, js, node_id, x, y):
    return {
        "parameters": {"jsCode": js},
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [x, y],
    }


def call_sub(name, wf_id, wf_name, node_id, x, y, continue_on_fail=False):
    node = {
        "parameters": {
            "workflowId": {"__rl": True, "mode": "list", "value": wf_id, "cachedResultName": wf_name},
            "mode": "each",
            "options": {},
        },
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.executeWorkflow",
        "typeVersion": 1.2,
        "position": [x, y],
    }
    if continue_on_fail:
        node["continueOnFail"] = True
    return node


workflow = {
    "name": "Bagnetchon — Website Orders Intake (main)",
    "nodes": [
        {
            "parameters": {
                "pollTimes": {"item": [{"mode": "everyMinute"}]},
                "documentId": {"__rl": True, "value": SPREADSHEET_ID, "mode": "id"},
                "sheetName": {"__rl": True, "value": "Website Orders", "mode": "name"},
                "event": "rowAdded",
                "options": {},
            },
            "type": "n8n-nodes-base.googleSheetsTrigger",
            "typeVersion": 1,
            "position": [304, 480],
            "id": "web-trigger-0001",
            "name": "Google Sheets Trigger",
            "notes": "Watches the 'Website Orders' tab the site's Apps Script writes to. After import: re-assign the Google Sheets Trigger credential and re-select the spreadsheet + tab here. Repoint for production by picking the prod spreadsheet.",
            "notesInFlow": True,
        },
        code_node("Validate Website Row", VALIDATE, "web-validate-0001", 544, 480),
        {
            "parameters": {
                "conditions": {
                    "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 1},
                    "conditions": [
                        {
                            "id": "web-valid-cond-0001",
                            "leftValue": "={{ $json.ok }}",
                            "rightValue": "",
                            "operator": {"type": "boolean", "operation": "true"},
                        }
                    ],
                    "combinator": "and",
                },
                "options": {},
            },
            "id": "web-valid-if-0001",
            "name": "Valid?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [768, 480],
        },
        code_node("Normalize Website Order", NORMALIZE, "web-normalize-0001", 976, 368),
        call_sub(
            "Call: Order → Invoice",
            ORDER_TO_INVOICE_ID,
            "Bagnetchon — Order to Invoice (sub)",
            "web-call-invoice-0001",
            1216,
            368,
            continue_on_fail=True,
        ),
        code_node("Build Success Notify", SUCCESS_NOTIFY, "web-success-notify-0001", 1456, 368),
        call_sub("Call: Notify (success)", NOTIFY_ID, "Bagnetchon — Notify (sub)", "web-call-notify-ok-0001", 1680, 368),
        code_node("Build Failure Notify", FAILURE_NOTIFY, "web-fail-notify-0001", 1456, 520),
        call_sub("Call: Notify (failure)", NOTIFY_ID, "Bagnetchon — Notify (sub)", "web-call-notify-fail-0001", 1680, 520),
        code_node("Build Notify Payload", VALIDATION_FAIL_NOTIFY, "web-badrow-notify-0001", 976, 592),
        call_sub(
            "Call: Notify (validation failure)", NOTIFY_ID, "Bagnetchon — Notify (sub)", "web-call-notify-badrow-0001", 1216, 592
        ),
    ],
    "pinData": {},
    "connections": {
        "Google Sheets Trigger": {"main": [[{"node": "Validate Website Row", "type": "main", "index": 0}]]},
        "Validate Website Row": {"main": [[{"node": "Valid?", "type": "main", "index": 0}]]},
        "Valid?": {
            "main": [
                [{"node": "Normalize Website Order", "type": "main", "index": 0}],
                [{"node": "Build Notify Payload", "type": "main", "index": 0}],
            ]
        },
        "Normalize Website Order": {"main": [[{"node": "Call: Order → Invoice", "type": "main", "index": 0}]]},
        "Call: Order → Invoice": {
            "main": [
                [
                    {"node": "Build Success Notify", "type": "main", "index": 0},
                    {"node": "Build Failure Notify", "type": "main", "index": 0},
                ]
            ]
        },
        "Build Success Notify": {"main": [[{"node": "Call: Notify (success)", "type": "main", "index": 0}]]},
        "Build Failure Notify": {"main": [[{"node": "Call: Notify (failure)", "type": "main", "index": 0}]]},
        "Build Notify Payload": {"main": [[{"node": "Call: Notify (validation failure)", "type": "main", "index": 0}]]},
    },
    "active": False,
    "settings": {"executionOrder": "v1"},
    "meta": {"templateCredsSetupCompleted": False},
    "tags": [],
}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(workflow, f, ensure_ascii=False, indent=2)
    f.write("\n")

print("wrote", OUT)
# sanity: re-load and list nodes
with open(OUT, encoding="utf-8") as f:
    d = json.load(f)
for n in d["nodes"]:
    print("  ", n["type"].replace("n8n-nodes-base.", ""), "|", n["name"])
