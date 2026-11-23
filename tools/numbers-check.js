#!/usr/bin/env node
/* tools/numbers-check.js — flags a number separated from its unit word by a
 * plain (breakable) space where the Design Standards say "numbers stay with
 * their units." Advisory: many hits are expected in data/JSON and are fine;
 * use this as a worklist, not a hard gate. Usage: node tools/numbers-check.js */
'use strict';
const path = require('path');
const { listHtmlFiles, visibleTextLines, REPO_ROOT } = require('./lib');

const UNIT_WORDS = ['px', 'percent', 'minutes', 'minute', 'hours', 'hour', 'seconds', 'second',
  'guests', 'days', 'day', 'weeks', 'week', 'issues', 'scenarios', 'seats'];
const unitAlt = UNIT_WORDS.join('|');
const re = new RegExp(`\\b(\\d[\\d,]*)[ \\t](${unitAlt})\\b`, 'gi');

let hits = 0;
for (const file of listHtmlFiles()) {
  const html = require('fs').readFileSync(file, 'utf8');
  const lines = visibleTextLines(html);
  lines.forEach((line, i) => {
    let m;
    const lre = new RegExp(re.source, 'gi');
    while ((m = lre.exec(line))) {
      hits++;
      console.log(`${path.relative(REPO_ROOT, file)}:${i + 1}: "${m[0]}" — number and unit split by a plain space`);
    }
  });
}
console.log(`\n${hits} number/unit split(s) found (advisory).`);
process.exit(0); // advisory only — never fails check-all by itself
