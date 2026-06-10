#!/usr/bin/env python3
"""
Build the importable n8n workflow JSON for the Bagnetchon order→invoice automation.

Reads Code-node JS from ../nodes/*.js, builds three n8n workflow objects
(main, order-to-invoice sub, notify sub) and writes:

  ../workflow.json                       — array of all three (n8n CLI import)
  ../workflows/01_main.json              — main intake (n8n GUI import)
  ../workflows/02_order_to_invoice.json  — Zoho invoice sub-workflow
  ../workflows/03_notify.json            — Slack/email notifier sub-workflow

Edit JS in nodes/, edit endpoint params here, then re-run:
    python3 scripts/build_workflow.py
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NODES = ROOT / "nodes"
WORKFLOWS_DIR = ROOT / "workflows"
WORKFLOWS_DIR.mkdir(exist_ok=True)


def jsfile(name: str) -> str:
    return (NODES / name).read_text()


def nid() -> str:
    return str(uuid.uuid4())


# ─────────────────────────────────────────────────────────────────────────────
# Helpers to build node parameter blocks
# ─────────────────────────────────────────────────────────────────────────────

def code_node(name: str, js_filename: str, x: int, y: int, *, disabled: bool = False, notes: str = "") -> dict:
    n = {
        "parameters": {"language": "javaScript", "jsCode": jsfile(js_filename)},
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [x, y],
    }
    if disabled:
        n["disabled"] = True
    if notes:
        n["notes"] = notes
        n["notesInFlow"] = True
    return n


def set_node(name: str, assignments: list[dict], x: int, y: int) -> dict:
    return {
        "parameters": {
            "mode": "manual",
            "duplicateItem": False,
            "assignments": {
                "assignments": [
                    {
                        "id": nid(),
                        "name": a["name"],
                        "value": a["value"],
                        "type": a.get("type", "string"),
                    }
                    for a in assignments
                ]
            },
            "options": {},
        },
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.set",
        "typeVersion": 3.4,
        "position": [x, y],
    }


def if_node(name: str, left: str, op: str, right: str, x: int, y: int, *, ltype: str = "string", rtype: str = "string") -> dict:
    return {
        "parameters": {
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose"},
                "conditions": [
                    {
                        "id": nid(),
                        "leftValue": left,
                        "rightValue": right,
                        "operator": {"type": ltype, "operation": op},
                    }
                ],
                "combinator": "and",
            },
            "options": {},
        },
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.2,
        "position": [x, y],
    }


def http_node(
    name: str,
    method: str,
    url: str,
    x: int,
    y: int,
    *,
    query: list[tuple[str, str]] | None = None,
    headers: list[tuple[str, str]] | None = None,
    json_body_expr: str | None = None,
    cred_type: str = "zohoOAuth2Api",
    disabled: bool = False,
    notes: str = "",
    retry: bool = True,
) -> dict:
    params: dict = {
        "method": method,
        "url": url,
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": cred_type,
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "X-com-zoho-invoice-organizationid", "value": "={{ $env.ZOHO_ORG_ID }}"},
                *([{"name": n, "value": v} for n, v in (headers or [])]),
            ]
        },
        "options": {},
    }
    if query:
        params["sendQuery"] = True
        params["queryParameters"] = {
            "parameters": [{"name": n, "value": v} for n, v in query]
        }
    if json_body_expr:
        params["sendBody"] = True
        params["contentType"] = "json"
        params["specifyBody"] = "json"
        params["jsonBody"] = json_body_expr

    node = {
        "parameters": params,
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [x, y],
    }
    if retry:
        node["retryOnFail"] = True
        node["maxTries"] = 4
        node["waitBetweenTries"] = 2000
    if disabled:
        node["disabled"] = True
    if notes:
        node["notes"] = notes
        node["notesInFlow"] = True
    return node


def google_sheets_trigger_node(name: str, x: int, y: int) -> dict:
    return {
        "parameters": {
            "authentication": "oAuth2",
            "pollTimes": {"item": [{"mode": "everyMinute"}]},
            "documentId": {"__rl": True, "mode": "id", "value": "={{ $env.GS_SPREADSHEET_ID }}"},
            "sheetName": {"__rl": True, "mode": "name", "value": "={{ $env.GS_RESPONSES_SHEET }}"},
            "event": "rowAdded",
            "options": {},
        },
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.googleSheetsTrigger",
        "typeVersion": 1,
        "position": [x, y],
    }


def google_sheets_read_node(name: str, sheet_name_expr: str, x: int, y: int) -> dict:
    return {
        "parameters": {
            "authentication": "oAuth2",
            "operation": "read",
            "documentId": {"__rl": True, "mode": "id", "value": "={{ $env.GS_SPREADSHEET_ID }}"},
            "sheetName": {"__rl": True, "mode": "name", "value": sheet_name_expr},
            "options": {"returnFirstMatch": False},
        },
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.googleSheets",
        "typeVersion": 4.5,
        "position": [x, y],
    }


def google_sheets_update_node(name: str, x: int, y: int, *, disabled: bool = False, notes: str = "") -> dict:
    """Updates the source row with the invoice id + sync status."""
    n = {
        "parameters": {
            "authentication": "oAuth2",
            "operation": "update",
            "documentId": {"__rl": True, "mode": "id", "value": "={{ $env.GS_SPREADSHEET_ID }}"},
            "sheetName": {"__rl": True, "mode": "name", "value": "={{ $env.GS_RESPONSES_SHEET }}"},
            "columns": {
                "mappingMode": "defineBelow",
                "value": {
                    "row_number": "={{ $json.writeback.row_number }}",
                    "Invoice ID": "={{ $json.invoice_id }}",
                    "Sync Status": "={{ $json.invoice_status }}",
                },
                "matchingColumns": ["row_number"],
                "schema": [],
            },
            "options": {},
        },
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.googleSheets",
        "typeVersion": 4.5,
        "position": [x, y],
    }
    if disabled:
        n["disabled"] = True
    if notes:
        n["notes"] = notes
        n["notesInFlow"] = True
    return n


def execute_workflow_trigger(name: str, x: int, y: int) -> dict:
    return {
        "parameters": {
            "inputSource": "passthrough",
        },
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.executeWorkflowTrigger",
        "typeVersion": 1.1,
        "position": [x, y],
    }


def execute_workflow_call(name: str, target_workflow_name: str, x: int, y: int) -> dict:
    """workflowId left empty — user picks from dropdown after import."""
    return {
        "parameters": {
            "source": "database",
            "workflowId": {"__rl": True, "mode": "list", "value": "", "cachedResultName": target_workflow_name},
            "mode": "each",
            "options": {},
        },
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.executeWorkflow",
        "typeVersion": 1.2,
        "position": [x, y],
    }


def switch_node(name: str, on_expr: str, cases: list[str], x: int, y: int) -> dict:
    return {
        "parameters": {
            "rules": {
                "values": [
                    {
                        "conditions": {
                            "options": {"caseSensitive": True, "typeValidation": "loose"},
                            "conditions": [{
                                "id": nid(),
                                "leftValue": on_expr,
                                "rightValue": case,
                                "operator": {"type": "string", "operation": "equals"},
                            }],
                            "combinator": "and",
                        },
                        "renameOutput": True,
                        "outputKey": case,
                    } for case in cases
                ]
            },
            "options": {"fallbackOutput": "none"},
        },
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.switch",
        "typeVersion": 3.2,
        "position": [x, y],
    }


def merge_node(name: str, num_inputs: int, x: int, y: int) -> dict:
    return {
        "parameters": {
            "mode": "append",
            "numberOfInputs": num_inputs,
        },
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.merge",
        "typeVersion": 3,
        "position": [x, y],
    }


def email_send_node(name: str, x: int, y: int) -> dict:
    return {
        "parameters": {
            "fromEmail": "={{ $env.NOTIFY_EMAIL_FROM }}",
            "toEmail": "={{ $env.NOTIFY_EMAIL_TO }}",
            "subject": "={{ $json.subject }}",
            "text": "={{ $json.text }}",
            "options": {},
        },
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.emailSend",
        "typeVersion": 2.1,
        "position": [x, y],
    }


def slack_http_node(name: str, x: int, y: int) -> dict:
    """Posts via incoming-webhook URL — no Slack credential required."""
    return {
        "parameters": {
            "method": "POST",
            "url": "={{ $env.NOTIFY_SLACK_WEBHOOK }}",
            "sendBody": True,
            "contentType": "json",
            "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify({ text: $json.text }) }}",
            "options": {},
        },
        "id": nid(),
        "name": name,
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [x, y],
        "retryOnFail": True,
        "maxTries": 3,
        "waitBetweenTries": 2000,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Connection helper
# ─────────────────────────────────────────────────────────────────────────────

def conn(*pairs) -> dict:
    """
    Build a connections object from (from_name, to_name, from_out=0, to_in=0) tuples.
    Multiple outputs (IF true=0, false=1) are supported via the from_out index.
    """
    out: dict = {}
    # Determine max output index per source so we size the outer list correctly
    for p in pairs:
        if len(p) == 2:
            src, dst = p
            sout, tin = 0, 0
        elif len(p) == 3:
            src, dst, sout = p
            tin = 0
        else:
            src, dst, sout, tin = p
        out.setdefault(src, {"main": []})
        while len(out[src]["main"]) <= sout:
            out[src]["main"].append([])
        out[src]["main"][sout].append({"node": dst, "type": "main", "index": tin})
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Workflow 1 — Main: Google Sheet intake → call sub-workflow
# ─────────────────────────────────────────────────────────────────────────────

def build_main_workflow() -> dict:
    nodes = [
        google_sheets_trigger_node("Form Responses (Sheet)", 240, 300),
        code_node("Validate Row", "main_validate_row.js", 460, 300),
        if_node(
            "Valid?",
            left="={{ $json.ok }}",
            op="true",
            right="",
            x=680, y=300,
            ltype="boolean",
        ),
        code_node("Normalize Order", "main_normalize_order.js", 900, 200),
        execute_workflow_call(
            "Call: Order → Invoice",
            "Bagnetchon — Order to Invoice (sub)",
            1140, 200,
        ),
        code_node("Build Notify Payload", "main_build_notify_payload.js", 900, 420),
        execute_workflow_call(
            "Call: Notify (validation failure)",
            "Bagnetchon — Notify (sub)",
            1140, 420,
        ),
    ]
    connections = conn(
        ("Form Responses (Sheet)", "Validate Row"),
        ("Validate Row", "Valid?"),
        ("Valid?", "Normalize Order", 0),
        ("Valid?", "Build Notify Payload", 1),
        ("Normalize Order", "Call: Order → Invoice"),
        ("Build Notify Payload", "Call: Notify (validation failure)"),
    )
    return _workflow_envelope("Bagnetchon — Sheet Intake (main)", nodes, connections)


# ─────────────────────────────────────────────────────────────────────────────
# Workflow 2 — Sub: Normalized order → Zoho draft invoice
# ─────────────────────────────────────────────────────────────────────────────

ZOHO_BASE = "={{ $env.ZOHO_BASE_URL }}"


def build_order_to_invoice_workflow() -> dict:
    nodes = [
        execute_workflow_trigger("From Caller", 200, 300),
        code_node("Validate Payload", "sub_validate_payload.js", 420, 300),
        google_sheets_read_node(
            "Load item_config",
            "={{ $env.GS_ITEM_CONFIG_SHEET }}",
            640, 300,
        ),
        set_node(
            "Build Idempotency Key",
            [
                {"name": "cf_source_row_id",
                 "value": "={{ $('Validate Payload').item.json.source_row_id }}"},
            ],
            860, 300,
        ),
        # ── idempotency check ────────────────────────────────────────────────
        http_node(
            "Check Existing Invoice", "GET", f"{ZOHO_BASE}/invoices",
            1080, 300,
            query=[
                ("organization_id", "={{ $env.ZOHO_ORG_ID }}"),
                ("cf_source_row_id",
                 "={{ $('Build Idempotency Key').item.json.cf_source_row_id }}"),
            ],
            notes="Filters Zoho invoices by the custom field cf_source_row_id. "
                  "If any rows return, we exit without creating.",
        ),
        if_node(
            "Already Invoiced?",
            left="={{ ($json.invoices || []).length }}",
            op="larger",
            right="0",
            x=1300, y=300,
            ltype="number", rtype="number",
        ),
        code_node("Exit Idempotent", "sub_exit_idempotent.js", 1540, 180),
        # ── contact dedupe: email → phone → create ──────────────────────────
        http_node(
            "Find Contact by Email", "GET", f"{ZOHO_BASE}/contacts",
            1540, 420,
            query=[
                ("organization_id", "={{ $env.ZOHO_ORG_ID }}"),
                ("email_contains",
                 "={{ $('Validate Payload').item.json.customer.email }}"),
            ],
        ),
        if_node(
            "Has Email Match?",
            left="={{ ($json.contacts || []).length }}",
            op="larger",
            right="0",
            x=1760, y=420,
            ltype="number", rtype="number",
        ),
        http_node(
            "Find Contact by Phone", "GET", f"{ZOHO_BASE}/contacts",
            1980, 540,
            query=[
                ("organization_id", "={{ $env.ZOHO_ORG_ID }}"),
                ("phone_contains",
                 "={{ $('Validate Payload').item.json.customer.phone }}"),
            ],
        ),
        if_node(
            "Has Phone Match?",
            left="={{ ($json.contacts || []).length }}",
            op="larger",
            right="0",
            x=2200, y=540,
            ltype="number", rtype="number",
        ),
        code_node(
            "Build Create-Contact Body",
            "sub_build_create_contact_body.js",
            2420, 660,
        ),
        http_node(
            "Create Contact", "POST", f"{ZOHO_BASE}/contacts",
            2640, 660,
            query=[("organization_id", "={{ $env.ZOHO_ORG_ID }}")],
            json_body_expr="={{ JSON.stringify($json) }}",
        ),
        merge_node("Contact Resolved", 3, 2640, 420),
        code_node("Resolve Contact", "sub_resolve_contact.js", 2860, 420),
        code_node("Build Line Items", "sub_build_line_items.js", 3080, 420),
        code_node("Build Invoice Payload", "sub_build_invoice_payload.js", 3300, 420),
        http_node(
            "Create Draft Invoice", "POST", f"{ZOHO_BASE}/invoices",
            3520, 420,
            query=[("organization_id", "={{ $env.ZOHO_ORG_ID }}")],
            json_body_expr="={{ JSON.stringify($json.invoice_payload) }}",
            disabled=True,
            notes="DISABLED on purpose. Enable after item_config has real "
                  "zoho_item_id values and you've verified one test order. "
                  "Creates a DRAFT invoice (status=draft); AUTO_FINALIZE is not "
                  "wired — flipping it requires a deliberate workflow edit.",
        ),
        google_sheets_update_node(
            "Write back to Source Row",
            3740, 420,
            disabled=True,
            notes="DISABLED on purpose. Enable after the Create Draft Invoice "
                  "step is verified. Updates the 'Invoice ID' and 'Sync Status' "
                  "columns on the responses sheet.",
        ),
        code_node("Return Summary", "sub_return_summary.js", 3960, 420),
    ]
    connections = conn(
        ("From Caller", "Validate Payload"),
        ("Validate Payload", "Load item_config"),
        ("Load item_config", "Build Idempotency Key"),
        ("Build Idempotency Key", "Check Existing Invoice"),
        ("Check Existing Invoice", "Already Invoiced?"),
        ("Already Invoiced?", "Exit Idempotent", 0),
        ("Already Invoiced?", "Find Contact by Email", 1),
        ("Find Contact by Email", "Has Email Match?"),
        ("Has Email Match?", "Contact Resolved", 0, 0),
        ("Has Email Match?", "Find Contact by Phone", 1),
        ("Find Contact by Phone", "Has Phone Match?"),
        ("Has Phone Match?", "Contact Resolved", 0, 1),
        ("Has Phone Match?", "Build Create-Contact Body", 1),
        ("Build Create-Contact Body", "Create Contact"),
        ("Create Contact", "Contact Resolved", 0, 2),
        ("Contact Resolved", "Resolve Contact"),
        ("Resolve Contact", "Build Line Items"),
        ("Build Line Items", "Build Invoice Payload"),
        ("Build Invoice Payload", "Create Draft Invoice"),
        ("Create Draft Invoice", "Write back to Source Row"),
        ("Write back to Source Row", "Return Summary"),
    )
    return _workflow_envelope(
        "Bagnetchon — Order to Invoice (sub)",
        nodes,
        connections,
        settings={"executionOrder": "v1",
                  "errorWorkflow": "Bagnetchon — Notify (sub)"},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Workflow 3 — Sub: Notify (Slack or email)
# ─────────────────────────────────────────────────────────────────────────────

def build_notify_workflow() -> dict:
    nodes = [
        execute_workflow_trigger("From Caller", 200, 300),
        code_node("Format Message", "notify_format.js", 420, 300),
        switch_node(
            "Choose Channel",
            on_expr="={{ $env.NOTIFY_CHANNEL }}",
            cases=["slack", "email"],
            x=640, y=300,
        ),
        slack_http_node("Post to Slack", 880, 200),
        email_send_node("Send Email", 880, 420),
    ]
    connections = conn(
        ("From Caller", "Format Message"),
        ("Format Message", "Choose Channel"),
        ("Choose Channel", "Post to Slack", 0),
        ("Choose Channel", "Send Email", 1),
    )
    return _workflow_envelope("Bagnetchon — Notify (sub)", nodes, connections)


# ─────────────────────────────────────────────────────────────────────────────
# Envelope + write
# ─────────────────────────────────────────────────────────────────────────────

def _workflow_envelope(name: str, nodes: list[dict], connections: dict, *, settings: dict | None = None) -> dict:
    return {
        "name": name,
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": settings or {"executionOrder": "v1"},
        "staticData": None,
        "meta": {"templateCredsSetupCompleted": False},
        "pinData": {},
        "versionId": "",
        "tags": [],
    }


def main() -> None:
    main_wf = build_main_workflow()
    sub_wf = build_order_to_invoice_workflow()
    notify_wf = build_notify_workflow()

    (ROOT / "workflow.json").write_text(
        json.dumps([main_wf, sub_wf, notify_wf], indent=2) + "\n"
    )
    (WORKFLOWS_DIR / "01_main.json").write_text(json.dumps(main_wf, indent=2) + "\n")
    (WORKFLOWS_DIR / "02_order_to_invoice.json").write_text(json.dumps(sub_wf, indent=2) + "\n")
    (WORKFLOWS_DIR / "03_notify.json").write_text(json.dumps(notify_wf, indent=2) + "\n")

    print(f"wrote workflow.json ({(ROOT / 'workflow.json').stat().st_size} bytes)")
    for f in sorted(WORKFLOWS_DIR.glob("*.json")):
        print(f"wrote {f.relative_to(ROOT)} ({f.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
