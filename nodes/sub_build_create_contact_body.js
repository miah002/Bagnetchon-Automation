/**
 * Sub-workflow — "Build Create-Contact Body" Code node
 * ----------------------------------------------------------------------------
 * Runs only when both the email and phone lookups failed. Builds the body
 * for POST /contacts.
 */
const order = $('Validate Payload').item.json;
const c = order.customer;

return [{
  json: {
    contact_name: c.name,
    contact_type: 'customer',
    contact_persons: [{
      first_name: c.name,
      email: c.email || undefined,
      phone: c.phone || undefined,
      is_primary_contact: true,
    }],
  },
}];
