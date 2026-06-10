/**
 * Sub-workflow — "Resolve Contact" Code node
 * ----------------------------------------------------------------------------
 * Reads the outputs of the three preceding contact-resolution HTTP nodes
 * (Find by Email → Find by Phone → Create) and picks the contact_id from
 * whichever path succeeded. Only one of the three branches will have run
 * for any single execution; the others will be undefined.
 *
 * Output is the normalized order plus `contact_id` and `contact_lookup`
 * ("matched_email" | "matched_phone" | "created"), passed forward.
 */
const order = $('Validate Payload').item.json;

let contact_id = null;
let lookup = null;

// Email-match branch
try {
  const out = $('Find Contact by Email').item?.json;
  if (out?.contacts?.length > 0) {
    contact_id = out.contacts[0].contact_id;
    lookup = 'matched_email';
  }
} catch (_) { /* branch didn't run */ }

// Phone-match branch
if (!contact_id) {
  try {
    const out = $('Find Contact by Phone').item?.json;
    if (out?.contacts?.length > 0) {
      contact_id = out.contacts[0].contact_id;
      lookup = 'matched_phone';
    }
  } catch (_) { /* branch didn't run */ }
}

// Create branch
if (!contact_id) {
  try {
    const out = $('Create Contact').item?.json;
    contact_id = out?.contact?.contact_id || null;
    if (contact_id) lookup = 'created';
  } catch (_) { /* branch didn't run */ }
}

if (!contact_id) {
  throw new Error('Could not resolve a Zoho contact_id (no match and no create result).');
}

return [{ json: { ...order, contact_id, contact_lookup: lookup } }];
