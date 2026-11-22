#!/usr/bin/env node
/* tools/product-name-check.js — flags any occurrence of a protected product
 * name that is split by a breakable (plain) space instead of a non-breaking
 * one, per the Design Standards "Product names stay on one line" rule.
 * Static/text-based: no browser needed. Usage: node tools/product-name-check.js */
'use strict';
const path = require('path');
const { listHtmlFiles, visibleTextLines, REPO_ROOT } = require('./lib');

// Each entry: the two (or more) words that must never be split by a plain space.
// We check the *source HTML* for "Word1 Word2" (plain space) where the standard
// requires "Word1&nbsp;Word2" (or a <span class="nobr">) between them.
const NAMES = [
  'Dynamics 365', 'Microsoft 365', 'Microsoft Copilot', 'Copilot Studio',
  'Copilot Cowork', 'Agent 365', 'Power Platform', 'Power Apps', 'Power Automate',
  'Power BI', 'Microsoft Teams', 'Microsoft Fabric', 'Business Central',
  'Contact Center', 'Customer Service', 'Supply Chain Management', 'Field Service',
  'Telecom & Media', 'Telecommunications & Media',
];

let failures = 0;
for (const file of listHtmlFiles()) {
  const html = require('fs').readFileSync(file, 'utf8');
  const lines = visibleTextLines(html);
  const visibleText = lines.join('\n');
  for (const name of NAMES) {
    // Plain-space version with a literal space (not &nbsp;/&#160;/\u00A0) between words.
    const words = name.split(' ');
    const plainSpacePattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(' ');
    const re = new RegExp(plainSpacePattern, 'g');
    let m;
    while ((m = re.exec(visibleText))) {
      const line = visibleText.slice(0, m.index).split('\n').length;
      console.log(`${path.relative(REPO_ROOT, file)}:${line}: "${name}" split by a plain space, needs &nbsp; (or .nobr)`);
      failures++;
    }
  }
}
console.log(`\n${failures} product-name split(s) found.`);
process.exit(failures ? 1 : 0);
