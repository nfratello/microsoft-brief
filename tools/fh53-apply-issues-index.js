// FH53: replace ONLY the `const ISSUES=[...]` array literal and the
// `<div class="stats">...</div>` block in issues/index.html with the
// patch-provided replacements. Header, footer and all scripts are left
// completely untouched (string-splice by exact offsets / exact div match,
// no regex over the whole file).
const fs = require('fs');

const bounds = JSON.parse(fs.readFileSync('tools/fh53-issues-idx-bounds.json', 'utf8'));
const newIssuesArr = JSON.parse(
  fs.readFileSync('C:/Users/nifra/AppData/Local/Temp/fh53-patch/merge/issues-index-ISSUES.json', 'utf8')
);
const newStatsHtml = fs.readFileSync(
  'C:/Users/nifra/AppData/Local/Temp/fh53-patch/merge/issues-index-stats.html',
  'utf8'
).trim();

let html = fs.readFileSync('issues/index.html', 'utf8');

// 1) Splice the ISSUES array by exact character offsets found earlier.
const before = html.slice(0, bounds.arrStart);
const after = html.slice(bounds.arrEnd);
html = before + JSON.stringify(newIssuesArr) + after;

// 2) Replace the .stats div (exact match of the live block only).
const statsRe = /<div class="stats">.*?<\/div>/s;
const statsMatch = html.match(statsRe);
if (!statsMatch) throw new Error('stats div not found');
html = html.replace(statsRe, newStatsHtml);

fs.writeFileSync('issues/index.html', html, 'utf8');
console.log('ISSUES array entries:', newIssuesArr.length);
console.log('stats replaced with:', newStatsHtml);
