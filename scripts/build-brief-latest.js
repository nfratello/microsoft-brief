// Regenerates:
//  - preview/<slug>.html  (sample "email creative" snapshots used by the
//    homepage edition picker) from each edition's newest issue file.
//  - brief/latest/index.html ("This week" / All Industries): iframes the
//    newest All Industries issue when one exists at the globally newest send
//    date; otherwise falls back to a "Choose your edition" list of that
//    week's issues instead of an older All Industries issue.
//  - Normalizes the "Telecom & Media" edition name wherever a stale long form
//    ("Telecommunications & Media" / "Telecom & Media")
//    appears in generated output.
//
// Never hand-edit the files this script writes. Run:
//   node scripts/build-issues-manifest.js   (regenerates issues/issues.json)
//   node scripts/build-brief-latest.js      (regenerates latest/preview pages)
const fs = require('fs');
const path = require('path');
const { shortName } = require('./edition-names');

const ROOT = path.join(__dirname, '..');
const issuesDir = path.join(ROOT, 'issues');

const EDITION_SLUG = {
  'Hospitality & Travel': 'hospitality',
  'Manufacturing & Mobility': 'manufacturing',
  'High Tech & Software': 'high-tech',
  'Telecom & Media': 'telecom-media',
  'Healthcare & Life Sciences': 'healthcare',
  'Financial Services': 'financial-services',
  'Retail & Consumer Goods': 'retail',
  'Energy & Utilities': 'energy',
  'Professional Services': 'professional-services',
  'State, Local & Education': 'state-local-edu',
  'Federal Government': 'federal',
  'Defense Industry': 'defense',
};

const NAME_FIX = {
  'Telecommunications & Media': 'Telecom & Media',
  'Telecom & Media': 'Telecom & Media',
  'State & Local Government and Education': 'State, Local & Education',
  'State, Local & Education': 'State, Local & Education',
};
function fixName(s) {
  if (!s) return s;
  return NAME_FIX[s] || s;
}

function readIssues() {
  const issues = JSON.parse(fs.readFileSync(path.join(issuesDir, 'issues.json'), 'utf-8'));
  for (const it of issues) {
    it.edition = fixName(it.edition);
    if (it.ind) it.ind = fixName(it.ind);
  }
  return issues;
}

function newestPerEdition(list) {
  const byEdition = {};
  for (const it of list) {
    const cur = byEdition[it.edition];
    if (!cur || it.date > cur.date || (it.date === cur.date && (it.no || 0) > (cur.no || 0))) {
      byEdition[it.edition] = it;
    }
  }
  return byEdition;
}

// --- Step 1: regenerate preview/<slug>.html for every edition ---------------
function extractEmailBody(issueHtml) {
  const startMarker = '</header>';
  const endMarker = '<footer class="fw-foot"';
  const s = issueHtml.indexOf(startMarker);
  const e = issueHtml.indexOf(endMarker);
  if (s === -1 || e === -1 || e < s) return null;
  return issueHtml.slice(s + startMarker.length, e);
}

function rebuildPreview(slug, issue, oldPreviewHtml) {
  const issueHtmlPath = path.join(issuesDir, issue.url);
  const issueHtml = fs.readFileSync(issueHtmlPath, 'utf-8');
  const body = extractEmailBody(issueHtml);
  if (!body) {
    console.warn(`  SKIP preview/${slug}.html — could not find header/footer markers in ${issue.url}`);
    return null;
  }

  // Reuse the existing preview file's <head> boilerplate (identical across
  // all preview files except <title>/og tags), and its backlink div pattern.
  const headEnd = oldPreviewHtml.indexOf('</head>');
  const bodyOpenEnd = oldPreviewHtml.indexOf('>', oldPreviewHtml.indexOf('<body'));
  const backlinkDivMatch = oldPreviewHtml.match(/<div style="text-align:center[^>]*>.*?<\/div>/s);
  const backlinkDiv = backlinkDivMatch ? backlinkDivMatch[0] : '';

  let head = oldPreviewHtml.slice(0, headEnd + '</head>'.length);
  // Swap <title> and the two og: meta tags for this issue.
  head = head.replace(/<title>[^<]*<\/title>/, `<title>Microsoft Brief: ${escAttr(issue.title)}</title>`);
  head = head.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="The Microsoft Brief &middot; ${escAttr(issue.edition)}">`);
  head = head.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(issue.title)}">`);

  const bodyOpenTag = oldPreviewHtml.slice(oldPreviewHtml.indexOf('<body'), bodyOpenEnd + 1);

  return `${head}\n${bodyOpenTag}${backlinkDiv}${body}</body></html>`;
}

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// P45: the k3 "must-read" headlines (and occasionally the lede) are short,
// hand-written strings that were previously only ever rendered inside a
// <script> block (the archive's embedded ISSUES array) — invisible to the
// product-name check, so they were never nbsp-protected. Now that this page
// renders them as real visible text, protect any known product name the
// same way every other visible page does (same list as
// tools/product-name-check.js) rather than hand-editing the source data.
const PROTECTED_NAMES = [
  'Dynamics 365', 'Microsoft 365', 'Microsoft Copilot', 'Copilot Studio',
  'Copilot Cowork', 'Agent 365', 'Power Platform', 'Power Apps', 'Power Automate',
  'Power BI', 'Microsoft Teams', 'Microsoft Fabric', 'Business Central',
  'Contact Center', 'Customer Service', 'Supply Chain Management', 'Field Service',
];
function protectNames(s) {
  let out = String(s);
  for (const name of PROTECTED_NAMES) {
    out = out.split(name).join(name.replace(/ /g, '\u00A0'));
  }
  return out;
}

function regeneratePreviews(newest) {
  const results = [];
  // All Industries -> preview/all.html
  const allIssue = newest['All Industries'];
  const previewAllPath = path.join(ROOT, 'preview', 'all.html');
  if (allIssue && fs.existsSync(previewAllPath)) {
    const old = fs.readFileSync(previewAllPath, 'utf-8');
    const next = rebuildPreview('all', allIssue, old);
    if (next && next !== old) {
      fs.writeFileSync(previewAllPath, next, 'utf-8');
      results.push({ file: 'preview/all.html', issue: allIssue.url, changed: true });
    } else {
      results.push({ file: 'preview/all.html', issue: allIssue.url, changed: false });
    }
  }

  for (const [edition, slug] of Object.entries(EDITION_SLUG)) {
    const issue = newest[edition];
    const previewPath = path.join(ROOT, 'preview', `${slug}.html`);
    if (!issue || !fs.existsSync(previewPath)) continue;
    const old = fs.readFileSync(previewPath, 'utf-8');
    const next = rebuildPreview(slug, issue, old);
    if (next && next !== old) {
      fs.writeFileSync(previewPath, next, 'utf-8');
      results.push({ file: `preview/${slug}.html`, issue: issue.url, changed: true });
    } else {
      results.push({ file: `preview/${slug}.html`, issue: issue.url, changed: false });
    }
  }
  return results;
}

// --- Step 2: regenerate brief/latest/index.html (All Industries) -----------
function monthAbbrev(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
}
function niceDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function rebuildBriefLatestIframeMode(allIssue, oldHtml) {
  // Direct replacement: iframe the real issue file, same pattern the other
  // 11 edition /latest/ pages already use, instead of a separate stripped
  // preview/all.html snapshot. Removes any stale "Archive edition" framing.
  let html = oldHtml;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>All Industries edition: this week's Brief &middot; The Microsoft Brief</title>`);
  html = html.replace(/<link rel="canonical"[^>]*>\s*/, '');
  html = html.replace('</head>', `<link rel="canonical" href="https://nfratello.github.io/microsoft-brief/issues/${allIssue.url}"></head>`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="This week's All Industries Brief">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(allIssue.title)}">`);
  // P44/P45: use the issue's own Monday-based "week" label, not a re-derived
  // send-date string, so this line can never drift from the issue page's own
  // "Week of ..." text.
  const weekShort = (allIssue.week || `Week of ${niceDate(allIssue.date)}`).replace(/^Week of /, '');
  html = html.replace(/<p>Nov \d[^<]*<\/p>/, `<p>${escAttr(allIssue.title)} &middot; ${escAttr(weekShort)}</p>`);
  html = html.replace(/src="\.\.\/\.\.\/preview\/all\.html"/, `src="../../issues/${allIssue.url}"`);
  return html;
}

// P45: Option A — list with preview pane. Order: Hospitality & Travel first
// (also the default-selected row), then the remaining core editions
// alphabetically, with Defense Industry and Federal Government always last
// (alphabetical between the two of them too). All editions present that
// week are included here (unlike the front door card, which only shows
// three and never Federal/Defense) — this is the full "Choose your
// edition" destination, not a teaser.
const LAST_EDITIONS = ['Defense Industry', 'Federal Government'];
function orderEditionsForChooser(thisWeekIssues) {
  const byEdition = {};
  for (const i of thisWeekIssues) byEdition[i.edition] = i;
  const names = Object.keys(byEdition);
  const core = names
    .filter((n) => n !== 'Hospitality & Travel' && !LAST_EDITIONS.includes(n))
    .sort((a, b) => a.localeCompare(b));
  const ordered = [];
  if (byEdition['Hospitality & Travel']) ordered.push('Hospitality & Travel');
  ordered.push(...core);
  for (const n of LAST_EDITIONS) if (byEdition[n]) ordered.push(n);
  return ordered.map((n) => byEdition[n]);
}

// Real, text-free, people-first "wide" hero photo already published on each
// edition's own Brief page, reused here (same repo, relative path — no
// cross-origin fetch needed). `pos` reuses that photo's own tuned CSS
// object-position from its source page so people stay in view at the
// preview card's 16:7 crop.
const EDITION_HERO = {
  'Hospitality & Travel': { file: 'hero-hospitality-wide.jpg', pos: '50% 40%', alt: 'People at work in travel' },
  'Manufacturing & Mobility': { file: 'ind-manufacturing-wide.jpg', pos: '50% 20%', alt: 'People at work in manufacturing' },
  'High Tech & Software': { file: 'ind-hightech-wide.jpg', pos: '50% 20%', alt: 'People at work in tech' },
  'Telecom & Media': { file: 'ind-telecom-wide.jpg', pos: '50% 25%', alt: 'People at work in telecom and media' },
  'Healthcare & Life Sciences': { file: 'ind-healthcare-wide.jpg', pos: '50% 20%', alt: 'People at work in healthcare' },
  'Financial Services': { file: 'ind-finserv-wide.jpg', pos: '50% 20%', alt: 'People at work in financial services' },
  'Retail & Consumer Goods': { file: 'ind-retail-wide.jpg', pos: '50% 20%', alt: 'People at work in retail' },
  'Energy & Utilities': { file: 'ind-energy-wide.jpg', pos: '50% 20%', alt: 'People at work in energy' },
  'Professional Services': { file: 'ind-profserv-wide.jpg', pos: '50% 10%', alt: 'People at work in professional services' },
  'State, Local & Education': { file: 'ind-sle-wide.jpg', pos: '50% 20%', alt: 'People at work in public sector' },
  'Defense Industry': { file: 'ind-defense-wide.jpg', pos: '50% 20%', alt: 'People at work in defense industry' },
  'Federal Government': { file: 'ind-federal-wide.jpg', pos: '50% 0%', alt: 'People at work in federal government' },
};

function rowHtml(issue, idx, selected) {
  const color = issue.c || issue.acc || '#0067b8';
  const icon = issue.fi || issue.icon || 'grid';
  return `<li><a class="lrow${selected ? ' sel' : ''}" href="../../issues/${issue.url}" data-idx="${idx}" aria-current="${selected ? 'true' : 'false'}" style="--c:${color}"><span class="ltile" style="background:${color}" data-fi="${icon}" aria-hidden="true"></span><span class="ltx"><b>${escAttr(shortName(issue.edition))}</b><span class="lrh">${escAttr(protectNames(issue.title))}</span></span><span class="lchev" aria-hidden="true">&rsaquo;</span></a></li>`;
}

function previewHtml(issue, idx, selected, featured) {
  const color = issue.c || issue.acc || '#0067b8';
  const hero = EDITION_HERO[issue.edition] || { file: 'ind-manufacturing-wide.jpg', pos: '50% 20%', alt: `People at work in ${issue.edition}` };
  const k3 = (issue.k3 || []).map((h) => `<li>${escAttr(protectNames(h))}</li>`).join('');
  const getLink = issue.get ? `../../${issue.get.replace(/^\.\.\//, '')}` : `../../${EDITION_SLUG[issue.edition] || ''}/#subscribe`;
  return `<div class="lpv"${featured ? ' id="lfeatpv"' : ` data-idx="${idx}"${selected ? '' : ' hidden'}`}><div class="lpvcard" style="--c:${color}"><div class="lph"><img src="../../assets/img/${hero.file}" width="1280" height="560" loading="${idx === 0 ? 'eager' : 'lazy'}" style="object-position:${hero.pos}" alt="${escAttr(hero.alt)}"></div><div class="lpb"><p class="lpe" style="color:${color}">${escAttr(shortName(issue.edition).toUpperCase())} EDITION</p><h2 class="llh2">${escAttr(protectNames(issue.title))}</h2><div class="lmeta"><span>${escAttr(issue.label || '')}</span><span>${escAttr(issue.rt || '')}</span><span>${escAttr(issue.week || '')}</span></div><p class="lsum">${escAttr(protectNames(issue.lede || issue.title))}</p><div class="lmr"><span class="lmrl" style="background:${color}">3 MUST-READS</span><ol>${k3}</ol></div><div class="lact"><a class="btn lbtn" href="../../issues/${issue.url}">Read the full issue <span class="arr" aria-hidden="true">&rsaquo;</span></a><a class="lget" href="${getLink}">Get ${escAttr(issue.edition)} every week</a></div></div></div></div>`;
}

const LLP_STYLE = `<style id="llp-css">.lgrid{display:grid;grid-template-columns:480px 1fr;gap:36px;align-items:start}
.lrows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;max-width:none}
.lrow{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #dfe5ee;border-radius:10px;padding:9px 12px;text-decoration:none;color:#0b1b33;min-block-size:54px;box-sizing:border-box;transition:box-shadow .15s ease,border-color .15s ease,background-color .15s ease}
.lrow:hover{box-shadow:0 4px 14px rgba(7,26,51,.08)}
.lrow:focus-visible{outline:2px solid var(--c);outline-offset:2px}
.ltile{flex:none;inline-size:34px;block-size:34px;border-radius:8px;display:grid;place-items:center}
.ltile .fic{display:block;inline-size:20px;block-size:20px;background:#fff;-webkit-mask:var(--m) center/contain no-repeat;mask:var(--m) center/contain no-repeat}
.ltx{display:flex;flex-direction:column;min-inline-size:0;flex:1;gap:1px}
.ltx b{font-size:14px;color:var(--c);font-weight:700}
.ltx .lrh{font-size:13px;color:#4b5563;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lchev{flex:none;color:#9aa3ad;font-size:20px;transition:transform .15s ease,color .15s ease}
.lrow:hover .lchev,.lrow:focus-visible .lchev,.lrow.sel .lchev{color:var(--c);transform:translateX(2px)}
.lrow.sel{border-color:var(--c);box-shadow:inset 4px 0 0 var(--c);background:color-mix(in srgb, var(--c) 6%, white)}
.lstick{position:sticky;top:20px}
.lpvcard{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.10);border:1px solid #e5e7eb}
.lph img{inline-size:100%;block-size:auto;aspect-ratio:16/7;object-fit:cover;display:block}
.lpb{padding:22px 26px 24px}
.lpe{font-size:12px;letter-spacing:.14em;font-weight:700;text-transform:uppercase;margin:0 0 8px}
.lpvcard h2{font-size:28px!important;line-height:1.15!important;margin:0 0 10px}
.lmeta{display:flex;gap:8px;flex-wrap:wrap;margin-block-end:12px}
.lmeta span{font-size:12px;background:#eef4f6;color:#1d5d73;padding-block:4px;padding-inline:10px;border-radius:99px;font-weight:600}
.lsum{color:#374151;line-height:1.5;margin:0 0 14px;font-size:15px}
.lmr{border-block-start:1px solid #eee;padding-block-start:12px}
.lmrl{font-size:11px;font-weight:700;letter-spacing:.1em;color:#fff;padding-block:4px;padding-inline:10px;border-radius:99px;text-transform:uppercase}
.lmr ol{margin:10px 0 0;padding-inline-start:20px;line-height:1.7;font-size:15px}
.lact{display:flex;align-items:center;gap:18px;margin-block-start:16px;flex-wrap:wrap}
.lbtn{background:#1d4ed8;color:#fff;display:inline-flex;align-items:center;gap:6px;border:0;cursor:pointer;font-weight:700;font-size:15px;border-radius:999px;padding-block:11px;padding-inline:20px;text-decoration:none;transition:background-color .15s ease,transform .15s ease,box-shadow .15s ease}
.lbtn:hover{background:#1e40af;transform:translateY(-1px);box-shadow:0 6px 16px -4px rgba(29,78,216,.6)}
.lbtn:active{background:#1e3a8a;transform:translateY(0)}
.lbtn:focus-visible{outline:2px solid #fff;box-shadow:0 0 0 2px #fff,0 0 0 4px #1d4ed8}
.lbtn .arr{display:inline-block;transition:transform .15s ease}
.lbtn:hover .arr,.lbtn:focus-visible .arr{transform:translateX(4px)}
.lget{color:#1d4ed8;font-size:14px;font-weight:600;text-decoration:none}
.lget:hover,.lget:focus-visible{text-decoration:underline}
.lhint{font-size:12px;color:#6b7280;margin-block-start:10px;text-align:center}
.llh1{font-size:40px!important;line-height:1.1!important;margin:0 0 8px}
@media (prefers-reduced-motion:reduce){.lrow,.lchev,.lbtn,.lbtn .arr{transition:none}.lbtn:hover{transform:none}}
.lfeat{display:none}
@media (max-width:1023px){.lgrid{display:block}.lright .lstick{display:none}.lhint{display:none}.lfeat{display:block;margin-block-end:24px}.lfeat .lpe::before{content:"FEATURED \\00b7 "}}
</style>`;

function rebuildBriefLatestChooseEdition(thisWeekIssues, oldHtml) {
  // Fallback: the newest send date has no All Industries issue. Show a
  // two-column list-with-preview-pane (P45 Option A) instead of an older
  // All Industries issue.
  const ordered = orderEditionsForChooser(thisWeekIssues);
  const date = thisWeekIssues[0].date;
  const weekLabel = thisWeekIssues[0].week || `Week of ${niceDate(date)}`;

  const rows = ordered.map((i, idx) => rowHtml(i, idx, idx === 0)).join('');
  const previews = ordered.map((i, idx) => previewHtml(i, idx, idx === 0, false)).join('');
  const featured = ordered.length ? previewHtml(ordered[0], 0, true, true) : '';

  let html = oldHtml;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>Choose your edition: this week's Brief &middot; The Microsoft Brief</title>`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="This week's Microsoft Brief &mdash; choose your edition">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(weekLabel)}">`);
  html = html.replace(/<link rel="canonical"[^>]*>\s*/, '');
  // Remove any previously-injected cye/llp style blocks before adding a fresh one (idempotent re-runs).
  html = html.replace(/<style id="cye-css">[\s\S]*?<\/style>/g, '');
  html = html.replace(/<style id="llp-css">[\s\S]*?<\/style>/g, '');
  html = html.replace(/<script id="llp-js">[\s\S]*?<\/script>/g, '');
  // FH47: the choose-edition layout has no #lf subscribe form, #lfr iframe or
  // #lsb sticky bar — those only exist in the single-issue iframe-mode
  // template this file is sometimes rebuilt from. Strip that dead script so
  // it can't throw "Cannot read properties of null (reading
  // 'addEventListener')" wiring up elements this layout doesn't render.
  html = html.replace(/<script id="latest-js">[\s\S]*?<\/script>/g, '');
  html = html.replace('</head>', `<link rel="canonical" href="https://nfratello.github.io/microsoft-brief/brief/latest/">${LLP_STYLE}</head>`);

  // Replace the whole <main>...</main> with the list + preview pane layout.
  const mainStart = html.indexOf('<main>');
  const mainEnd = html.indexOf('</main>') + '</main>'.length;
  if (mainStart === -1 || mainEnd === -1) return html;
  const newMain = `<main><section class="wrap" style="padding-block:40px"><div class="lgrid"><div class="lleft"><p class="eyebrow" style="color:#0067b8;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:13px;margin:0 0 8px">${escAttr(weekLabel)}</p><h1 class="llh1" style="margin:0 0 8px">Choose your edition</h1><p class="lede" style="margin:0 0 24px;color:#5b6b80">Pick an industry to preview it. Open it to read the full issue.</p><div class="lfeat">${featured}</div><ul class="lrows" role="list">${rows}</ul></div><div class="lright"><div class="lstick"><div class="lpv-wrap" aria-live="polite">${previews}</div><p class="lhint">Preview updates as you hover or tap an edition.</p></div></div></div></section></main><script id="llp-js">(function(){var rows=[].slice.call(document.querySelectorAll('.lrow'));var pvs=[].slice.call(document.querySelectorAll('.lpv[data-idx]'));function select(idx){rows.forEach(function(r){var on=r.dataset.idx===idx;r.classList.toggle('sel',on);r.setAttribute('aria-current',on?'true':'false')});pvs.forEach(function(p){p.hidden=p.dataset.idx!==idx})}rows.forEach(function(r){r.addEventListener('mouseenter',function(){select(r.dataset.idx)});r.addEventListener('focus',function(){select(r.dataset.idx)})});var B='../../icons/';[].forEach.call(document.querySelectorAll('.ltile[data-fi]'),function(el){var u=B+el.dataset.fi+'_24_filled.svg',im=new Image();im.onload=function(){var sp=document.createElement('span');sp.className='fic';sp.style.setProperty('--m','url("'+u+'")');el.appendChild(sp)};im.src=u})})();</script>`;
  html = html.slice(0, mainStart) + newMain + html.slice(mainEnd);
  return html;
}

function regenerateBriefLatest(newest, issues) {
  const briefLatestPath = path.join(ROOT, 'brief', 'latest', 'index.html');
  const oldHtml = fs.readFileSync(briefLatestPath, 'utf-8');
  const allDates = [...new Set(issues.map(i => i.date))].sort().reverse();
  const globalNewestDate = allDates[0];
  const allIssue = newest['All Industries'];
  const hasAllAtNewest = allIssue && allIssue.date === globalNewestDate;

  let next, mode;
  if (hasAllAtNewest) {
    next = rebuildBriefLatestIframeMode(allIssue, oldHtml);
    mode = 'all-industries-issue';
  } else {
    const thisWeek = issues.filter(i => i.date === globalNewestDate);
    next = rebuildBriefLatestChooseEdition(thisWeek, oldHtml);
    mode = 'choose-your-edition-fallback';
  }
  const changed = next !== oldHtml;
  if (changed) fs.writeFileSync(briefLatestPath, next, 'utf-8');
  return { mode, changed, date: globalNewestDate };
}

// --- main --------------------------------------------------------------
function main() {
  const issues = readIssues();
  const newest = newestPerEdition(issues);

  console.log('Regenerating preview/*.html from newest issue per edition...');
  const previewResults = regeneratePreviews(newest);
  for (const r of previewResults) {
    console.log(`  ${r.changed ? 'UPDATED' : 'unchanged'}  ${r.file}  <-  issues/${r.issue}`);
  }

  console.log('\nRegenerating brief/latest/index.html (All Industries)...');
  const briefResult = regenerateBriefLatest(newest, issues);
  console.log(`  mode=${briefResult.mode} changed=${briefResult.changed} date=${briefResult.date}`);

  console.log('\nDone.');
}

main();
