// FH53: replace ONLY the `<section ... id="editions">...</section>` block in
// each of the 12 industry pages with the matching patch file's content.
// Uses exact substring-slice replacement (find the opening tag that has
// id="editions", then the matching closing </section> for that same
// section via depth-counted <section>/</section> scanning) so nothing else
// on the page is touched.
const fs = require('fs');
const path = require('path');

const industries = [
  'defense', 'energy', 'federal', 'financial-services', 'healthcare',
  'high-tech', 'hospitality', 'manufacturing', 'professional-services',
  'retail', 'state-local-edu', 'telecom-media',
];

const mergeDir = 'C:/Users/nifra/AppData/Local/Temp/fh53-patch/merge/editions';

function replaceEditionsSection(html, replacement) {
  const openMarker = /<section[^>]*\sid="editions"[^>]*>/;
  const m = html.match(openMarker);
  if (!m) throw new Error('no id="editions" section found');
  const openStart = m.index;
  const openEnd = openStart + m[0].length;

  // Depth-counted scan for the matching </section>, starting after the
  // opening tag (depth=1 for this section itself).
  const tagRe = /<section\b[^>]*>|<\/section>/g;
  tagRe.lastIndex = openEnd;
  let depth = 1;
  let tm;
  let closeStart = -1;
  let closeEnd = -1;
  while ((tm = tagRe.exec(html))) {
    if (tm[0] === '</section>') {
      depth--;
      if (depth === 0) {
        closeStart = tm.index;
        closeEnd = tm.index + tm[0].length;
        break;
      }
    } else {
      depth++;
    }
  }
  if (closeStart === -1) throw new Error('matching </section> not found');

  return html.slice(0, openStart) + replacement.trim() + html.slice(closeEnd);
}

for (const ind of industries) {
  const pagePath = path.join(ind, 'index.html');
  const mergePath = path.join(mergeDir, `${ind}.html`);
  const html = fs.readFileSync(pagePath, 'utf8');
  const replacement = fs.readFileSync(mergePath, 'utf8');
  const next = replaceEditionsSection(html, replacement);
  fs.writeFileSync(pagePath, next, 'utf8');
  console.log(`${ind}: OK, ${html.length} -> ${next.length} chars`);
}
