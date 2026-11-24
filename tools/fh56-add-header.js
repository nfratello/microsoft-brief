// FH56 step A.5: add the shared Frontier header, copy-link button and
// share-line.js script reference to the new All Industries Issue No. 3 page,
// which (per inspection) was generated with no header at all. Same method as
// FH50/FH52/FH53: pull the exact header block, css link and script tag from a
// known-good current sibling page.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GOOD_PAGE = path.join(ROOT, 'issues', '2026-11-24-telecom-media-003.html');

const NEW_PAGES = ['2026-11-24-all-industries-003.html'];

const good = fs.readFileSync(GOOD_PAGE, 'utf8');
const LINK_RE = /<link rel="stylesheet" href="[^"]*frontier-style\.css[^"]*">/;
const HEADER_RE = /<header class="gh">[\s\S]*?<\/header>/;
const SCRIPT_RE = /<script src="[^"]*assets\/js\/share-line\.js" defer><\/script>/;

const link = good.match(LINK_RE)[0];
const header = good.match(HEADER_RE)[0];
const script = good.match(SCRIPT_RE)[0];

let fixed = 0, skipped = 0;
for (const name of NEW_PAGES) {
  const p = path.join(ROOT, 'issues', name);
  let html = fs.readFileSync(p, 'utf8');
  const before = html;

  if (!LINK_RE.test(html)) {
    html = html.replace('</head>', `${link}</head>`);
  }
  if (!HEADER_RE.test(html)) {
    html = html.replace(/(<body[^>]*>)/, `$1${header}`);
  }
  if (!SCRIPT_RE.test(html)) {
    html = html.replace('</body></html>', `${script}</body></html>`);
  }

  if (html !== before) {
    fs.writeFileSync(p, html, 'utf8');
    fixed++;
    console.log('fixed', name);
  } else {
    skipped++;
    console.log('already ok', name);
  }
}
console.log(`\n${fixed} fixed, ${skipped} already ok.`);
