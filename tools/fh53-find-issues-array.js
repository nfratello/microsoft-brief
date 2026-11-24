// FH53 scratch helper: find the exact bounds of the `const ISSUES=[...]`
// array literal embedded in issues/index.html via bracket/string-aware
// scanning (not regex), so it can be replaced without touching anything
// else (header, footer, scripts) per the publish prompt's instruction.
const fs = require('fs');

const html = fs.readFileSync('issues/index.html', 'utf8');
const marker = 'const ISSUES=';
const startIdx = html.indexOf(marker);
const arrStart = startIdx + marker.length;
if (html[arrStart] !== '[') throw new Error('expected [ at arrStart, got ' + html[arrStart]);

let depth = 0;
let i = arrStart;
let inStr = false;
let strCh = '';
for (; i < html.length; i++) {
  const ch = html[i];
  if (inStr) {
    if (ch === '\\') { i++; continue; }
    if (ch === strCh) inStr = false;
    continue;
  }
  if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue; }
  if (ch === '[' || ch === '{') depth++;
  else if (ch === ']' || ch === '}') {
    depth--;
    if (depth === 0) { i++; break; }
  }
}

const arrText = html.slice(arrStart, i);
let parsed;
try {
  parsed = JSON.parse(arrText);
  console.log('parsed OK, length', parsed.length);
} catch (e) {
  console.log('parse failed:', e.message);
}
console.log('markerStart', startIdx, 'arrStart', arrStart, 'arrEnd', i, 'nextChar', JSON.stringify(html[i]));
fs.writeFileSync('tools/fh53-issues-idx-bounds.json', JSON.stringify({ markerStart: startIdx, arrStart, arrEnd: i }));
