#!/usr/bin/env node
/* tools/check-all.js — runs every static check and prints one PASS/FAIL
 * table. Does NOT run screenshots or deploy (those are explicit, separate
 * steps). Usage: node tools/check-all.js */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');

const CHECKS = [
  ['validate-html', 'validate-html.js'],
  ['product-name', 'product-name-check.js'],
  ['numbers (advisory)', 'numbers-check.js'],
  ['contrast', 'contrast-check.js'],
  ['orphan (rendered)', 'orphan-check.js'],
  ['overlap (rendered)', 'overlap-check.js'],
];

const results = [];
for (const [label, script] of CHECKS) {
  try {
    const out = execFileSync('node', [path.join(__dirname, script)], { encoding: 'utf8' });
    results.push({ label, pass: true, tail: out.trim().split('\n').slice(-1)[0] });
  } catch (e) {
    const out = (e.stdout || '').toString();
    results.push({ label, pass: false, tail: out.trim().split('\n').slice(-1)[0] || e.message });
  }
}

console.log('\nCheck                  | Result | Detail');
console.log('------------------------|--------|-------');
for (const r of results) {
  console.log(`${r.label.padEnd(23)} | ${(r.pass ? 'PASS' : 'FAIL').padEnd(6)} | ${r.tail}`);
}
const hardFailures = results.filter((r) => !r.pass && r.label !== 'numbers (advisory)');
console.log(`\n${hardFailures.length === 0 ? 'ALL CHECKS PASS' : hardFailures.length + ' CHECK(S) FAILED'}`);
process.exit(hardFailures.length ? 1 : 0);
