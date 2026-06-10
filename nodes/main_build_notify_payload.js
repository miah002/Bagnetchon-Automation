/**
 * Main workflow — "Build Notify Payload" Code node (validation-failure path)
 * ----------------------------------------------------------------------------
 * When "Validate Row" finds problems, we hand the Notify sub-workflow a
 * compact, channel-agnostic payload. The Notify workflow decides whether
 * to format it as Slack text or email body.
 */
const v = $input.item.json;
return [{
  json: {
    severity: 'error',
    stage: 'sheet-intake-validation',
    source: 'google_sheet',
    errors: v.errors || ['unknown validation failure'],
    row: v.row,
  },
}];
