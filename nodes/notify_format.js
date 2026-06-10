/**
 * Notify sub-workflow — "Format Message" Code node
 * ----------------------------------------------------------------------------
 * Formats the incoming payload into a single human-readable message used
 * by both Slack and email channels.
 */
const p = $input.item.json;
const lines = [];

lines.push(`*Bagnetchon automation alert*`);
lines.push(`severity: ${p.severity ?? 'info'}`);
lines.push(`stage:    ${p.stage ?? 'unknown'}`);
lines.push(`source:   ${p.source ?? 'unknown'}`);

if (Array.isArray(p.errors) && p.errors.length) {
  lines.push('');
  lines.push('errors:');
  for (const e of p.errors) lines.push(`  - ${e}`);
}

if (p.row && typeof p.row === 'object') {
  lines.push('');
  lines.push('row:');
  for (const [k, v] of Object.entries(p.row)) {
    lines.push(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  }
}

if (p.error_message) {
  lines.push('');
  lines.push(`error: ${p.error_message}`);
}

const text = lines.join('\n');
const subject = `[Bagnetchon] ${p.severity ?? 'info'} at ${p.stage ?? 'unknown'}`;

return [{ json: { text, subject } }];
