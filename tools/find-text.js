#!/usr/bin/env node
/* tools/find-text.js — search visible page text (not markup/attributes/script/style)
 * across every HTML file in the repo.
 * Usage: node tools/find-text.js "<pattern>"   (pattern is a JS regex, case-insensitive) */
'use strict';
const path = require('path');
const { listHtmlFiles, visibleTextLines, REPO_ROOT } = require('./lib');

const pattern = process.argv[2];
if (!pattern) {
  console.error('Usage: node tools/find-text.js "<pattern>"');
  process.exit(2);
}
const re = new RegExp(pattern, 'i');
let hits = 0;
for (const file of listHtmlFiles()) {
  const html = require('fs').readFileSync(file, 'utf8');
  const lines = visibleTextLines(html);
  lines.forEach((line, i) => {
    if (re.test(line)) {
      hits++;
      console.log(`${path.relative(REPO_ROOT, file)}:${i + 1}: ${line.trim().slice(0, 160)}`);
    }
  });
}
console.log(`\n${hits} matching line(s) across ${listHtmlFiles().length} files.`);
process.exit(hits ? 0 : 1);
