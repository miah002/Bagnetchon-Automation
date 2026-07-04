#!/usr/bin/env python3
"""Patch 02_order_to_invoice.json for website orders (backward compatible).

1. Build Idempotency Key — honor payload.invoice_number_hint (the website
   order ref) so two same-day orders from one customer don't collide on the
   initials+MMDDYY invoice number. Form path unchanged (no hint sent).
2. Build Line Items — honor selected_items[].qty and .rate from website rows.
   Form path unchanged (fields absent -> qty 1, catalog/default rate).
3. Write back to Source Row — target the tab/spreadsheet from the payload's
   writeback block (falls back to the form vars), so website rows get their
   Invoice ID / Sync Status written to the Website Orders tab.

Run:  python scripts/patch_02_website_support.py
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WF = os.path.join(ROOT, "workflows", "02_order_to_invoice.json")

with open(WF, encoding="utf-8") as f:
    doc = json.load(f)

nodes = {n["name"]: n for n in doc["nodes"]}
failures = []


def replace_in_code(node_name, old, new):
    node = nodes[node_name]
    code = node["parameters"]["jsCode"]
    if old not in code:
        failures.append(f"{node_name}: pattern not found:\n---\n{old}\n---")
        return
    if code.count(old) != 1:
        failures.append(f"{node_name}: pattern not unique ({code.count(old)} hits)")
        return
    node["parameters"]["jsCode"] = code.replace(old, new)


# ---- 1. Build Idempotency Key: invoice_number_hint ----
replace_in_code(
    "Build Idempotency Key",
    "const expected_invoice_number = (initials || 'XX') + _pad(_dt.mm) + _pad(_dt.dd) + _pad(_dt.yy);",
    "// Website orders carry a globally-unique ref (BGN-...) as invoice_number_hint —\n"
    "// use it verbatim so two same-day orders from one customer don't collide.\n"
    "// Form orders (no hint) keep the initials+MMDDYY scheme.\n"
    "const _hint = String(order.invoice_number_hint || '').trim();\n"
    "const expected_invoice_number = _hint || ((initials || 'XX') + _pad(_dt.mm) + _pad(_dt.dd) + _pad(_dt.yy));",
)

# ---- 2. Build Line Items: qty + website rate ----
replace_in_code(
    "Build Line Items",
    "for (const sel of order.selected_items) {\n  const row = byText.get(normalize(sel.selected_text));",
    "for (const sel of order.selected_items) {\n  const row = byText.get(normalize(sel.selected_text));\n"
    "  // Website rows carry real quantities + server-computed unit prices; form\n"
    "  // rows have neither (qty defaults to 1, rate comes from catalog/config).\n"
    "  const qty = Math.max(1, parseInt(sel.qty, 10) || 1);\n"
    "  const websiteRate = sel.rate != null ? Number(sel.rate) : null;",
)

replace_in_code(
    "Build Line Items",
    "    // No internal description on the line — the invoice is customer-facing.\n"
    "    line_items.push({\n      name: itemName,\n      rate: 0,\n      quantity: 1,\n    });\n    continue;",
    "    // No internal description on the line — the invoice is customer-facing.\n"
    "    line_items.push({\n      name: itemName,\n      rate: websiteRate != null ? websiteRate : 0,\n      quantity: qty,\n    });\n    continue;",
)

replace_in_code(
    "Build Line Items",
    "  if (zohoItemId) {\n    line_items.push({ item_id: zohoItemId, quantity: 1 });\n  } else {",
    "  if (zohoItemId) {\n"
    "    const li = { item_id: zohoItemId, quantity: qty };\n"
    "    // Keep the invoice equal to what the website charged, even if the Zoho\n"
    "    // catalog price drifts from the site menu.\n"
    "    if (websiteRate != null) li.rate = websiteRate;\n"
    "    line_items.push(li);\n"
    "  } else {",
)

replace_in_code(
    "Build Line Items",
    "    const rate = Number(row.default_rate ?? 0) || 0;",
    "    const rate = websiteRate != null ? websiteRate : (Number(row.default_rate ?? 0) || 0);",
)

replace_in_code(
    "Build Line Items",
    "    line_items.push({\n      name: itemName,\n      rate,\n      quantity: 1,\n    });",
    "    line_items.push({\n      name: itemName,\n      rate,\n      quantity: qty,\n    });",
)

# ---- 3. Write back: payload-driven target with form-var fallback ----
wb = nodes["Write back to Source Row"]["parameters"]
if wb["documentId"]["value"] == "={{ $vars.GS_SPREADSHEET_ID }}":
    wb["documentId"]["value"] = (
        "={{ ($('Build Invoice Payload').item.json.writeback || {}).spreadsheet_id || $vars.GS_SPREADSHEET_ID }}"
    )
else:
    failures.append("Write back: documentId value unexpected")
if wb["sheetName"]["value"] == "={{ $vars.GS_RESPONSES_SHEET }}":
    wb["sheetName"]["value"] = (
        "={{ ($('Build Invoice Payload').item.json.writeback || {}).sheet_name || $vars.GS_RESPONSES_SHEET }}"
    )
else:
    failures.append("Write back: sheetName value unexpected")

if failures:
    print("PATCH FAILED — no changes written:")
    for f_ in failures:
        print(" *", f_)
    sys.exit(1)

with open(WF, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=2)
    f.write("\n")
print("patched", WF)
