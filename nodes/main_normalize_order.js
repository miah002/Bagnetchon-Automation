const crypto = require('crypto');
const row = $input.item.json.row;

const email = String(row['Email Address'] ?? '').trim().toLowerCase();
const timestamp = String(row['Timestamp'] ?? '').trim();

const idHash = crypto
  .createHash('sha256')
  .update(timestamp + '|' + email)
  .digest('hex')
  .slice(0, 16);

const META = new Set([
  'Timestamp', 'Email Address', 'What is your name?',
  'What date, day and time do you need the food/service?',
  'Contact number or mobile (for confirmation & follow-up)',
  'What type of event are you planning?', 'Estimated number of guests attending:',
  'Service Method ', 'Service Method', 'Delivery location ', 'Delivery location',
  '"On which social media platform was the advertisement seen?"',
  'row_number', 'Invoice ID', 'Sync Status',
]);

const LECHON_COL = 'Bagnetchon Signature Menu --\nHome of Premium Filipino Roasted Lechon';

const selected_items = [];
for (const [k, v] of Object.entries(row)) {
  if (META.has(k)) continue;
  if (k.startsWith('Bagnetchon ORDER, PAYMENT')) continue;
  if (!v || !String(v).trim()) continue;
  const text = String(v).trim();
  if (k === LECHON_COL || k.startsWith('Bagnetchon Signature Menu')) {
    // Multi-select: comma-separated
    for (const part of text.split(/,\s+/).map(s => s.trim()).filter(Boolean)) {
      selected_items.push({ sheet_column_header: k, selected_text: part });
    }
  } else {
    selected_items.push({ sheet_column_header: k, selected_text: text });
  }
}

const serviceMethod = String(row['Service Method '] ?? row['Service Method'] ?? '').trim();
const deliveryLocation = String(row['Delivery location '] ?? row['Delivery location'] ?? '').trim();

return [{ json: {
  source: 'google_sheet',
  source_row_id: 'gs:' + idHash,
  customer: {
    email,
    name: String(row['What is your name?'] ?? '').trim(),
    phone: String(row['Contact number or mobile (for confirmation & follow-up)'] ?? '').trim(),
  },
  fulfillment: {
    date: String(row['What date, day and time do you need the food/service?'] ?? '').trim(),
    type: serviceMethod,
    address: deliveryLocation || null,
    event_type: String(row['What type of event are you planning?'] ?? '').trim(),
    guest_count: row['Estimated number of guests attending:'] ?? null,
  },
  selected_items,
  writeback: {
    kind: 'google_sheet',
    spreadsheet_id: $vars.GS_SPREADSHEET_ID,
    sheet_name: $vars.GS_RESPONSES_SHEET,
    row_number: row.row_number ?? null,
  },
}}];