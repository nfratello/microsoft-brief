// FH53 fix: the editions grid's responsive CSS has a specificity bug.
// `@media (max-width:1100px){#editions .edg[style*="--cols:4"]{2 cols}}`
// has higher specificity than
// `@media (max-width:760px){#editions .edg{1 col}}`,
// so pages whose "new issues" grid has exactly 4 cards stay stuck at 2
// columns even on narrow phones, causing real horizontal overflow (not just
// an orphan-row issue). This never fired before FH53 because no industry
// page's grid had exactly 4 cards in its top section until this publish
// added a 4th issue to several industries. Fix: give the 760px single-column
// rule an equal-specificity `[style*="--cols:4"]` selector so it wins the
// cascade (same specificity, later in source order) at narrow widths.
const fs = require('fs');

const industries = [
  'defense', 'energy', 'federal', 'financial-services', 'healthcare',
  'high-tech', 'hospitality', 'manufacturing', 'professional-services',
  'retail', 'state-local-edu', 'telecom-media',
];

const OLD = '@media (max-width:760px){#editions .edg{grid-template-columns:1fr!important}}';
const NEW = '@media (max-width:760px){#editions .edg,#editions .edg[style*="--cols:4"]{grid-template-columns:1fr!important}}';

for (const ind of industries) {
  const p = `${ind}/index.html`;
  const html = fs.readFileSync(p, 'utf8');
  const count = html.split(OLD).length - 1;
  if (count !== 1) throw new Error(`${ind}: expected exactly 1 match, found ${count}`);
  const next = html.replace(OLD, NEW);
  fs.writeFileSync(p, next, 'utf8');
  console.log(`${ind}: OK`);
}
