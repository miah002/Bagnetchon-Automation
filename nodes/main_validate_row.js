const row = $input.item.json;
const errors = [];

const email = String(row['Email Address'] ?? '').trim();
if (!email) {
  errors.push('email is missing');
} else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  errors.push('email format looks wrong');
}

const name = String(row['What is your name?'] ?? '').trim();
if (!name) errors.push('name is missing');

const fulfillmentDate = String(row['What date, day and time do you need the food/service?'] ?? '').trim();
if (!fulfillmentDate) errors.push('fulfillment date is missing');

const serviceMethod = String(row['Service Method '] ?? row['Service Method'] ?? '').trim();
if (!serviceMethod) errors.push('service method is missing');

if (serviceMethod.toLowerCase().includes('delivery')) {
  const deliveryLocation = String(row['Delivery location '] ?? row['Delivery location'] ?? '').trim();
  if (!deliveryLocation) errors.push('delivery location is required for Delivery orders');
}

const META = new Set([
  'Timestamp', 'Email Address', 'What is your name?',
  'What date, day and time do you need the food/service?',
  'Contact number or mobile (for confirmation & follow-up)',
  'What type of event are you planning?', 'Estimated number of guests attending:',
  'Service Method ', 'Service Method', 'Delivery location ', 'Delivery location',
  '"On which social media platform was the advertisement seen?"',
  'row_number', 'Invoice ID', 'Sync Status',
]);

let hasSelection = false;
for (const [k, v] of Object.entries(row)) {
  if (META.has(k)) continue;
  if (k.startsWith('Bagnetchon ORDER, PAYMENT')) continue;
  if (v && String(v).trim()) { hasSelection = true; break; }
}
if (!hasSelection) errors.push('no menu items selected');

return [{ json: { ok: errors.length === 0, row, errors } }];