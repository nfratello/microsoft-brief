const fs = require('fs');
const p = 'C:/Users/nifra/source/microsoft-brief/issues/2026-11-24-all-industries-003.html';
let html = fs.readFileSync(p, 'utf8');
const before = html;
let count1 = (html.match(/Microsoft Copilot Blog/g) || []).length;
let count2 = (html.match(/Microsoft Copilot&nbsp;Cowork/g) || []).length;
console.log('count1 (Blog)', count1, 'count2 (Cowork)', count2);
html = html.split('Microsoft Copilot Blog').join('Microsoft&nbsp;Copilot Blog');
html = html.split('Microsoft Copilot&nbsp;Cowork').join('Microsoft&nbsp;Copilot&nbsp;Cowork');
if (html !== before) {
  fs.writeFileSync(p, html, 'utf8');
  console.log('fixed, bytes before/after:', before.length, html.length);
} else {
  console.log('no change made');
}
