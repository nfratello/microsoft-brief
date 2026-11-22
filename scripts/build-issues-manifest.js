// Generates the canonical issues manifest (issues/issues.json) from the
// hand-entered ISSUES array embedded in issues/index.html. Run via
// `node scripts/build-issues-manifest.js` — never hand-edit issues.json.
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'issues', 'index.html');
const html = fs.readFileSync(indexPath, 'utf-8');
const m = html.match(/const ISSUES=(\[.*?\]);/s);
if (!m) { console.error('ISSUES array not found in issues/index.html'); process.exit(1); }
const issues = JSON.parse(m[1]);

// Normalize edition display names to the one name used everywhere (P37):
// the archive/ISSUES data carries older long-form names in some fields.
const EDITION_NAME_FIX = {
  'Telecommunications & Media': 'Telecom & Media',
  'Telecom & Media': 'Telecom & Media',
};
for (const issue of issues) {
  if (EDITION_NAME_FIX[issue.edition]) issue.edition = EDITION_NAME_FIX[issue.edition];
  if (EDITION_NAME_FIX[issue.ind]) issue.ind = EDITION_NAME_FIX[issue.ind];
}

console.log(`Parsed ${issues.length} issues from embedded ISSUES array`);
fs.writeFileSync(
  path.join(__dirname, '..', 'issues', 'issues.json'),
  JSON.stringify(issues, null, 1) + '\n',
  'utf-8'
);
console.log('Wrote issues/issues.json');

// Round-trip: re-inject the (now name-normalized) manifest back into the
// embedded ISSUES array that issues/index.html's archive script reads, so
// the archive page and issues.json never drift apart. The embedded array
// uses a slightly different key set (ind/c/fi/em/k3/kind/mon/day/cta/first)
// alongside the manifest fields — preserve those by merging onto the
// original parsed objects (which already have them) rather than replacing
// wholesale.
const newArrayLiteral = JSON.stringify(issues);
const newHtml = html.replace(/const ISSUES=\[.*?\];/s, `const ISSUES=${newArrayLiteral};`);
if (newHtml !== html) {
  fs.writeFileSync(indexPath, newHtml, 'utf-8');
  console.log('Re-synced issues/index.html ISSUES array (name fixes applied)');
} else {
  console.log('issues/index.html ISSUES array already in sync');
}
