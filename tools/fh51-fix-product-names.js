#!/usr/bin/env node
/* tools/fh51-fix-product-names.js — one-time repair script (FH51).
 *
 * Commit d252382 (the bulk header revert FH50 later fixed) also reverted the
 * text content of ~100 pages back to an older revision that pre-dated a round
 * of &nbsp;-joining fixes for protected product names ("Microsoft Copilot",
 * "Dynamics 365", etc.) — see tools/product-name-check.js for the full list
 * and the Design Standards "product names stay on one line" rule. That raised
 * tools/product-name-check.js's failure count from 1 (pre-existing, unrelated
 * to the revert — products/copilot/index.html) to 330 across the repo.
 *
 * This script fixes every plain-space split of a protected product name in
 * visible text (anything between a `>` and the next `<`, i.e. not inside a
 * tag/attribute, and never inside <script>/<style>) by inserting &nbsp;
 * between every word of the name, matching exactly what
 * tools/product-name-check.js checks for. Safe/idempotent: only touches a
 * literal plain-space run of the exact name; already-fixed text (which uses
 * &nbsp;) is left untouched, and re-running finds nothing left to change.
 *
 * Usage: node tools/fh51-fix-product-names.js [--apply]
 * Without --apply, prints what would change and exits 0 (dry run). */
'use strict';
const fs = require('fs');
const path = require('path');
const { listHtmlFiles, REPO_ROOT } = require('./lib');

// Same list as tools/product-name-check.js, longest (most words) first so a
// longer name is joined before a shorter name that could be a substring of it.
const NAMES = [
  'Supply Chain Management', 'Telecom & Media', 'Telecommunications & Media',
  'Dynamics 365', 'Microsoft 365', 'Microsoft Copilot', 'Copilot Studio',
  'Copilot Cowork', 'Agent 365', 'Power Platform', 'Power Apps', 'Power Automate',
  'Power BI', 'Microsoft Teams', 'Microsoft Fabric', 'Business Central',
  'Contact Center', 'Customer Service', 'Field Service',
].sort((a, b) => b.split(' ').length - a.split(' ').length);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fixVisibleText(html) {
  // Protect <script>/<style> blocks from any replacement.
  const blocks = [];
  let work = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, (m) => {
    blocks.push(m);
    return `\u0000BLOCK${blocks.length - 1}\u0000`;
  });
  let changed = 0;
  // Only touch text strictly between a tag's `>` and the next `<` (never inside a tag/attribute).
  work = work.replace(/(>)([^<]+)(<)/g, (whole, open, text, close) => {
    let t = text;
    for (const name of NAMES) {
      const words = name.split(' ');
      const re = new RegExp(words.map(escapeRegex).join(' '), 'g');
      t = t.replace(re, () => { changed++; return words.join('&nbsp;'); });
    }
    return open + t + close;
  });
  work = work.replace(/\u0000BLOCK(\d+)\u0000/g, (m, i) => blocks[Number(i)]);
  return { html: work, changed };
}

function main() {
  const apply = process.argv.includes('--apply');
  let totalFixed = 0;
  let filesChanged = 0;
  for (const file of listHtmlFiles()) {
    const original = fs.readFileSync(file, 'utf8');
    const { html, changed } = fixVisibleText(original);
    if (changed > 0) {
      filesChanged++;
      totalFixed += changed;
      const rel = path.relative(REPO_ROOT, file);
      console.log(`${rel}: ${changed} fix(es)${apply ? '' : ' (dry run)'}`);
      if (apply) fs.writeFileSync(file, html, 'utf8');
    }
  }
  console.log(`\n${totalFixed} product-name split(s) fixed across ${filesChanged} file(s).${apply ? '' : ' Re-run with --apply to write.'}`);
}

main();
