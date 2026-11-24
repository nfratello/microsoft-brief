#!/usr/bin/env node
/* tools/header-check.js — fails if any page is missing the shared Frontier header
 * (added FH50, after a bulk regression put the old pre-shared-header nav back on
 * every page in the repo). Static/text-based: no browser needed.
 * Asserts each page's nav contains "Becoming Frontier", "The Brief", "The Hub" and
 * "The Coach", and does NOT contain the old header's distinguishing nav items
 * ("Customer stories", "How it's built"). Pages with no header at all (email
 * previews, the welcome page) are skipped.
 * Added FH52, after FH50's restore brought back the header's copy-link button
 * markup but not the <script> tag that wires it up (the script lived outside the
 * <header> block FH50's regex covered): also fails if a page with the shared
 * header is missing (a) the copy-link button itself (button.aka) or (b) the
 * <script src="...assets/js/share-line.js"> reference anywhere in the page.
 * Usage: node tools/header-check.js */
'use strict';
const path = require('path');
const fs = require('fs');
const { listHtmlFiles, REPO_ROOT } = require('./lib');

const REQUIRED = ['Becoming Frontier', 'The Brief', 'The Hub', 'The Coach'];
const FORBIDDEN_NAV = ['Customer stories', "How it's built"];
const SHARE_SCRIPT_RE = /<script[^>]*src="[^"]*assets\/js\/share-line\.js"[^>]*>/;
const COPY_BUTTON_RE = /<button[^>]*class="aka"[^>]*>/;

// Pages that intentionally have no site header (email previews, welcome landing).
const SKIP_PATTERNS = [/[\\/]preview[\\/]/, /[\\/]welcome[\\/]/];

let failures = 0;
let checked = 0;
for (const file of listHtmlFiles()) {
  if (SKIP_PATTERNS.some((re) => re.test(file))) continue;
  const html = fs.readFileSync(file, 'utf8');
  const headerMatch = html.match(/<header[^>]*>[\s\S]*?<\/header>/);
  const rel = path.relative(REPO_ROOT, file);
  if (!headerMatch) {
    console.log(`${rel}: no <header> element found`);
    failures++;
    continue;
  }
  checked++;
  const header = headerMatch[0];
  for (const needle of REQUIRED) {
    if (!header.includes(needle)) {
      console.log(`${rel}: shared header missing "${needle}"`);
      failures++;
    }
  }
  for (const needle of FORBIDDEN_NAV) {
    if (header.includes(needle)) {
      console.log(`${rel}: old pre-shared-header nav item "${needle}" found in header`);
      failures++;
    }
  }
  if (!COPY_BUTTON_RE.test(header)) {
    console.log(`${rel}: shared header missing the copy-link button (button.aka)`);
    failures++;
  }
  if (!SHARE_SCRIPT_RE.test(html)) {
    console.log(`${rel}: page missing <script src="...assets/js/share-line.js"> reference`);
    failures++;
  }
}
console.log(`\n${failures} header issue(s) found across ${checked} page(s) checked.`);
process.exit(failures ? 1 : 0);
