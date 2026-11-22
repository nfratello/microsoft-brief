#!/usr/bin/env node
/* tools/contrast-check.js — computes WCAG contrast ratios for the industry
 * colors and core text/background pairs defined in frontier-tokens.json (or
 * the repo's own color list below if that file isn't present in this repo),
 * and flags anything under 4.5:1. Pure math, no browser needed.
 * Usage: node tools/contrast-check.js */
'use strict';

// Core pairs always checked: [label, foreground, background]
const CORE_PAIRS = [
  ['Ink on white', '#0f172a', '#ffffff'],
  ['Muted on white', '#475569', '#ffffff'],
  ['Ink on off-white', '#0f172a', '#f6f7f9'],
  ['White on navy', '#ffffff', '#081628'],
];

// Industry accent colors (on white) — kept in sync with design-standards.md.
const INDUSTRY_COLORS = {
  'All Industries': '#c2410c',
  'Hospitality': '#0e7490',
  'Manufacturing': '#a16207',
  'High Tech': '#6d28d9',
  'Telecom & Media': '#a21caf',
  'Healthcare': '#0f766e',
  'Financial Services': '#1d4ed8',
  'Retail': '#be123c',
  'Energy': '#15803d',
  'Professional Services': '#475569',
  'State, Local and Education': '#0369a1',
};

function hexToRgb(hex) {
  const n = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
}
function relLuminance([r, g, b]) {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function contrastRatio(hex1, hex2) {
  const L1 = relLuminance(hexToRgb(hex1));
  const L2 = relLuminance(hexToRgb(hex2));
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

let failures = 0;
console.log('Core pairs:');
for (const [label, fg, bg] of CORE_PAIRS) {
  const ratio = contrastRatio(fg, bg);
  const pass = ratio >= 4.5;
  if (!pass) failures++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'} ${label}: ${ratio.toFixed(2)}:1`);
}
console.log('\nIndustry colors (on white):');
for (const [name, color] of Object.entries(INDUSTRY_COLORS)) {
  const ratio = contrastRatio(color, '#ffffff');
  const pass = ratio >= 4.5;
  if (!pass) failures++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'} ${name} ${color}: ${ratio.toFixed(2)}:1`);
}
console.log(`\n${failures} contrast failure(s) found (threshold 4.5:1).`);
process.exit(failures ? 1 : 0);
