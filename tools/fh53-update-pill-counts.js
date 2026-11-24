// FH53 (Scout decision, logged under "Decisions made without asking"):
// update the CSS-hidden `.pills` filter-button counts in issues/index.html
// so the runtime-built `<select>` dropdown (which reads these counts) stays
// numerically accurate after the merge, even though the prompt only
// explicitly required replacing the ISSUES array and the .stats div. This
// does not touch header, footer or any <script> block.
const fs = require('fs');

// Count against the patch's own long-form-named ISSUES array (the exact
// data this page's filter JS does `i.edition===ed` against), not
// issues.json, since issues/index.html uses the long/stale edition-name
// forms in its embedded data while issues.json uses the short canonical
// forms (reconciled only inside scripts/build-brief-latest.js).
const idx = JSON.parse(
  fs.readFileSync('C:/Users/nifra/AppData/Local/Temp/fh53-patch/merge/issues-index-ISSUES.json', 'utf8')
);
const byEd = {};
for (const e of idx) byEd[e.edition] = (byEd[e.edition] || 0) + 1;
const execCount = idx.filter((e) => e.exec).length;
const total = idx.length;

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&');
}

let html = fs.readFileSync('issues/index.html', 'utf8');
const pillsStart = html.indexOf('<div class="pills"');
const pillsEnd = html.indexOf('</div>', pillsStart) + '</div>'.length;
let pillsHtml = html.slice(pillsStart, pillsEnd);

const buttonRe = /(<button class="pill[^"]*" type="button" data-ed="([^"]*)"[^>]*>.*?<span class="ct">)(\d+)(<\/span>)/g;
pillsHtml = pillsHtml.replace(buttonRe, (full, pre, dataEd, oldCt, post) => {
  const decoded = decodeEntities(dataEd);
  let newCt;
  if (decoded === '') newCt = total;
  else if (decoded === '__exec') newCt = execCount;
  else newCt = byEd[decoded];
  if (newCt === undefined) {
    console.log('WARNING: no count found for data-ed=', JSON.stringify(decoded), '- leaving unchanged');
    return full;
  }
  return pre + newCt + post;
});

html = html.slice(0, pillsStart) + pillsHtml + html.slice(pillsEnd);
fs.writeFileSync('issues/index.html', html, 'utf8');
console.log('byEd:', byEd, 'execCount:', execCount, 'total:', total);
