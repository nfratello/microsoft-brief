// Regenerates:
//  - preview/<slug>.html  (sample "email creative" snapshots used by the
//    homepage edition picker) from each edition's newest issue file.
//  - brief/latest/index.html ("This week" / All Industries): iframes the
//    newest All Industries issue when one exists at the globally newest send
//    date; otherwise falls back to a "Choose your edition" list of that
//    week's issues instead of an older All Industries issue.
//  - Normalizes the "Telecom & Media" edition name wherever a stale long form
//    ("Telecommunications, Media & Gaming" / "Telecom, Media & Gaming")
//    appears in generated output.
//
// Never hand-edit the files this script writes. Run:
//   node scripts/build-issues-manifest.js   (regenerates issues/issues.json)
//   node scripts/build-brief-latest.js      (regenerates latest/preview pages)
const fs = require('fs');
const path = require('path');

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
  'State & Local Government and Education': 'state-local-edu',
  'Federal Government': 'federal',
  'Defense Industry': 'defense',
};

const NAME_FIX = {
  'Telecommunications, Media & Gaming': 'Telecom & Media',
  'Telecom, Media & Gaming': 'Telecom & Media',
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
  html = html.replace(/<p>Nov \d[^<]*<\/p>/, `<p>${escAttr(allIssue.title)} &middot; ${niceDate(allIssue.date)}</p>`);
  html = html.replace(/src="\.\.\/\.\.\/preview\/all\.html"/, `src="../../issues/${allIssue.url}"`);
  return html;
}

function rebuildBriefLatestChooseEdition(thisWeekIssues, oldHtml) {
  // Fallback: the newest send date has no All Industries issue. Show that
  // week's issue list instead of an older All Industries issue.
  const date = thisWeekIssues[0].date;
  const cards = thisWeekIssues
    .slice()
    .sort((a, b) => a.edition.localeCompare(b.edition))
    .map(i => `<li><a class="cye" href="../../issues/${i.url}" style="--c:${i.c || '#0067b8'}"><span class="ced">${escAttr(i.edition)}</span><span class="ctt">${escAttr(i.title)}</span><span class="cgo" aria-hidden="true">&rarr;</span></a></li>`)
    .join('');

  let html = oldHtml;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>Choose your edition: this week's Brief &middot; The Microsoft Brief</title>`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="This week's Microsoft Brief &mdash; choose your edition">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="Week of ${escAttr(niceDate(date))}">`);
  html = html.replace(/<link rel="canonical"[^>]*>\s*/, '');
  html = html.replace('</head>', `<link rel="canonical" href="https://nfratello.github.io/microsoft-brief/brief/latest/"><style id="cye-css">.cye{display:flex;align-items:center;gap:14px;padding:16px 20px;background:#fff;border:1px solid #dfe5ee;border-left:4px solid var(--c);border-radius:12px;text-decoration:none;color:#0b1b33;transition:box-shadow .15s,transform .15s}.cye:hover{box-shadow:0 8px 20px rgba(7,26,51,.1);transform:translateY(-1px)}.cye:focus-visible{outline:2px solid var(--c);outline-offset:2px}.ced{flex:none;min-width:200px;font-weight:700;color:var(--c);font-size:14px}.ctt{flex:1;font-size:15px}.cgo{flex:none;color:var(--c);font-weight:700}@media (max-width:640px){.cye{flex-direction:column;align-items:flex-start;gap:4px}.ced{min-width:0}}</style></head>`);

  // Replace the whole <main>...</main> with a lightweight edition chooser.
  const mainStart = html.indexOf('<main>');
  const mainEnd = html.indexOf('</main>') + '</main>'.length;
  if (mainStart === -1 || mainEnd === -1) return html;
  const newMain = `<main><section class="wrap" style="padding-block:40px"><p class="eyebrow" style="color:#0067b8;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:13px;margin:0 0 8px">Week of ${escAttr(niceDate(date))}</p><h1 style="margin:0 0 8px">Choose your edition</h1><p class="lede" style="margin:0 0 24px;color:#5b6b80">This week's Brief went out by industry. Pick yours to read it.</p><ul style="list-style:none;margin:0;padding:0;display:grid;gap:12px;max-width:720px">${cards}</ul></section></main>`;
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
