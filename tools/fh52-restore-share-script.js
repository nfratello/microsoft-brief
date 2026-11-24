// FH52 one-time repair script.
// FH50's header restore (tools/fh50-restore-header.js) spliced back the <header class="gh">...
// </header> HTML block and the frontier-style.css <link> tag from commit 837c9f4 (the last
// known-good revision), but its regex boundaries covered only those two regions. The good
// revision's <script src="assets/js/share-line.js" defer></script> tag lived at the very end of
// <body>, well outside both the header block and the <head> CSS link, so it was never part of
// what FH50 copied back in. Every page kept the "aka.ms/MicrosoftBrief" button markup (added by
// Design standards v1.5/v2.1 and still present in the header block FH50 did restore) but had no
// script loaded anywhere to wire a click handler to it — so the button looked right but did
// nothing on every one of the ~101 pages carrying the shared header.
//
// This script inserts the missing <script src="...assets/js/share-line.js" defer></script> tag
// immediately before </body></html> on every page that has <header class="gh">, using the same
// relative-path depth already used by that page's own assets/css/frontier-style.css link (or
// assets/icons/copilot.png in the header) so the path is correct at any folder depth.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const SCRIPT_RE = /assets\/js\/share-line\.js/;
const CSS_HREF_RE = /href="([^"]*assets\/css\/frontier-style\.css)"/;
const BODY_CLOSE_RE = /<\/body><\/html>\s*$/;

function listAffectedFiles() {
  const out = execSync('git grep -l "<header class=\\"gh\\">" -- "*.html"', { cwd: repoRoot, encoding: 'utf8' });
  return out.split(/\r?\n/).filter(Boolean);
}

function prefixFor(current) {
  const m = current.match(CSS_HREF_RE);
  if (!m) return null;
  // href looks like "assets/css/frontier-style.css" or "../assets/css/frontier-style.css" etc.
  const href = m[1];
  const idx = href.indexOf('assets/css/frontier-style.css');
  return href.slice(0, idx);
}

function restoreFile(file, apply) {
  const curPath = path.join(repoRoot, file);
  const current = fs.readFileSync(curPath, 'utf8');

  if (SCRIPT_RE.test(current)) return { file, status: 'already present' };

  const prefix = prefixFor(current);
  if (prefix == null) return { file, status: 'skipped (no frontier-style.css link found)' };

  if (!BODY_CLOSE_RE.test(current)) return { file, status: 'skipped (no </body></html> found)' };

  const tag = `<script src="${prefix}assets/js/share-line.js" defer></script>`;
  const updated = current.replace(BODY_CLOSE_RE, `${tag}</body></html>`);

  if (updated === current) return { file, status: 'no change' };
  if (apply) fs.writeFileSync(curPath, updated, 'utf8');
  return { file, status: apply ? 'fixed' : 'would fix' };
}

function main() {
  const apply = process.argv.includes('--apply');
  const files = listAffectedFiles();
  const results = files.map((f) => restoreFile(f, apply));
  const summary = {};
  for (const r of results) summary[r.status] = (summary[r.status] || 0) + 1;
  console.log(`Processed ${results.length} files.`);
  console.log(summary);
  const problems = results.filter((r) => r.status.startsWith('skipped'));
  if (problems.length) {
    console.log('Problems:');
    for (const p of problems) console.log(` - ${p.file}: ${p.status}`);
  }
}

main();
