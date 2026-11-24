// FH53 step 2: add the shared Frontier header (css link + <header class="gh">...)
// and the FH52 share-line.js script reference to the 13 new issue pages, which were
// generated with no header at all. Same method as FH50/FH52: pull the exact header
// block, css link and script tag from a known-good current sibling page.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GOOD_PAGE = path.join(ROOT, 'issues', '2026-11-18-defense-002.html');

const NEW_PAGES = [
  '2026-11-24-defense-003.html', '2026-11-24-energy-003.html', '2026-11-24-executive-002.html',
  '2026-11-24-federal-003.html', '2026-11-24-financial-services-003.html', '2026-11-24-healthcare-003.html',
  '2026-11-24-high-tech-003.html', '2026-11-24-hospitality-003.html', '2026-11-24-manufacturing-003.html',
  '2026-11-24-professional-services-003.html', '2026-11-24-retail-003.html', '2026-11-24-state-local-edu-003.html',
  '2026-11-24-telecom-media-003.html',
];

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
