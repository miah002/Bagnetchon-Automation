#!/usr/bin/env node
/**
 * Pull the live item catalog from a Zoho Invoice org and write it to CSV.
 *
 * Reads credentials from ../.zoho_secrets.json (gitignored):
 *   { "client_id": "...", "client_secret": "...", "refresh_token": "...",
 *     "org_id": "871137692", "accounts_url": "https://accounts.zoho.com",
 *     "base_url": "https://www.zohoapis.com/invoice/v3" }
 *
 *   node tools/pull_real_items.js [outfile.csv]
 *
 * No secrets on the command line. Output columns: zoho_item_id, name, rate,
 * status, description.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const secrets = JSON.parse(fs.readFileSync(path.join(ROOT, '.zoho_secrets.json'), 'utf8'));
const OUT = process.argv[2] || path.join(ROOT, 'real_zoho_items.csv');
const ACCOUNTS = secrets.accounts_url || 'https://accounts.zoho.com';
const BASE = secrets.base_url || 'https://www.zohoapis.com/invoice/v3';

function req(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const r = https.request(
      { method, hostname: u.hostname, path: u.pathname + u.search, headers },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      },
    );
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

(async () => {
  // 1) get access token.
  // If a one-time grant_code is present, exchange it (authorization_code) and
  // print the refresh_token so it can be saved for reuse. Otherwise refresh.
  let tokenUrl;
  if (secrets.grant_code) {
    tokenUrl =
      `${ACCOUNTS}/oauth/v2/token?grant_type=authorization_code` +
      `&client_id=${encodeURIComponent(secrets.client_id)}` +
      `&client_secret=${encodeURIComponent(secrets.client_secret)}` +
      `&code=${encodeURIComponent(secrets.grant_code)}`;
  } else {
    tokenUrl =
      `${ACCOUNTS}/oauth/v2/token?grant_type=refresh_token` +
      `&refresh_token=${encodeURIComponent(secrets.refresh_token)}` +
      `&client_id=${encodeURIComponent(secrets.client_id)}` +
      `&client_secret=${encodeURIComponent(secrets.client_secret)}`;
  }
  const tok = await req('POST', tokenUrl);
  const tokJson = JSON.parse(tok.body);
  if (!tokJson.access_token) {
    console.error('Token error:', tok.body);
    process.exit(1);
  }
  if (tokJson.refresh_token) {
    console.log('NEW refresh_token (save this in n8n + .zoho_secrets.json):');
    console.log(tokJson.refresh_token);
  }
  const access = tokJson.access_token;
  const headers = {
    Authorization: `Zoho-oauthtoken ${access}`,
    'X-com-zoho-invoice-organizationid': secrets.org_id,
  };

  // 2) page through items
  const items = [];
  let page = 1;
  for (;;) {
    const url = `${BASE}/items?organization_id=${secrets.org_id}&per_page=200&page=${page}`;
    const res = await req('GET', url, headers);
    const j = JSON.parse(res.body);
    if (j.code !== 0) {
      console.error('Items error:', res.body);
      process.exit(1);
    }
    items.push(...(j.items || []));
    if (!j.page_context || !j.page_context.has_more_page) break;
    page += 1;
  }

  // 3) write CSV
  const header = ['zoho_item_id', 'name', 'rate', 'status', 'description'];
  const lines = [header.join(',')];
  for (const it of items) {
    lines.push([it.item_id, it.name, it.rate, it.status, it.description].map(csvCell).join(','));
  }
  fs.writeFileSync(OUT, lines.join('\n') + '\n');
  console.log(`Wrote ${items.length} items -> ${path.relative(ROOT, OUT)}`);
})();
