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

// Normalize edition display names to the one name used everywhere (P37, P44):
// the archive/ISSUES data carries older long-form names in some fields.
const EDITION_NAME_FIX = {
  'Telecommunications & Media': 'Telecom & Media',
  'Telecom & Media': 'Telecom & Media',
  'State & Local Government and Education': 'State, Local & Education',
  'State, Local & Education': 'State, Local & Education',
};
for (const issue of issues) {
  if (EDITION_NAME_FIX[issue.edition]) issue.edition = EDITION_NAME_FIX[issue.edition];
  if (EDITION_NAME_FIX[issue.ind]) issue.ind = EDITION_NAME_FIX[issue.ind];
}

// P44: add a "week" label to every issue — "Week of <Month> <Day>, <Year>"
// for the Monday on/before the issue's send date, matching the literal text
// already hand-authored at the top of every issue page ("<Edition> edition
// · Week of November 16, 2026"). Computed once here (the one source of
// truth) rather than re-derived or hand-typed anywhere else — the front
// door Brief card and the /brief/latest/ fallback view both read this same
// field so they can never show a different week than the issue itself.
function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const daysSinceMonday = (dow + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d;
}
function weekLabel(dateStr) {
  const monday = mondayOf(dateStr);
  return `Week of ${monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
}
for (const issue of issues) {
  issue.week = weekLabel(issue.date);
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
