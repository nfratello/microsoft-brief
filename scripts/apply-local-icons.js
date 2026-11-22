/* scripts/apply-local-icons.js — P37 icon-centralization reply.
 *
 * For every page that fetched Fluent icon SVGs from the jsDelivr CDN at
 * runtime, this repoints that fetch at the repo's own /icons/ folder
 * (built by build-icon-sprite.js, which writes a standalone
 * icons/<name>_24_regular.svg for every icon name the site uses under the
 * exact filename the old CDN URL already requested). No other JS logic
 * changes — this is a single base-URL substitution per occurrence, so the
 * existing, already-working paint/cache logic keeps running unchanged, just
 * against a local, governed source instead of an external CDN.
 *
 * It also deletes the one exact duplicate inline script every page carried
 * (a second, self-contained IIFE that re-did the identical icon-fetch-and-
 * paint work a second time) — removing real, safely-isolated duplication
 * without touching the primary window.fiPaint definition's surrounding
 * closure (which this script intentionally leaves alone, to avoid risking
 * a scoping break in code this script cannot fully see end-to-end on every
 * page).
 *
 * Run with: node scripts/apply-local-icons.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { listHtmlFiles, REPO_ROOT } = require('../tools/lib');

const CDN_BASE = "https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.341/icons/";

// The exact duplicate IIFE every page carried in addition to the primary
// window.fiPaint definition (verified byte-identical across every file that
// has it before this change).
const DUP_IIFE_RE = /\(\(\)=>\{const B='https:\/\/cdn\.jsdelivr\.net\/npm\/@fluentui\/svg-icons@1\.1\.341\/icons\/';document\.querySelectorAll\('\[data-fi\]'\)\.forEach\(el=>\{const n=el\.dataset\.fi;const u=B\+n\+'_24_regular\.svg';const im=new Image\(\);im\.addEventListener\('load',\(\)=>\{const sp=document\.createElement\('span'\);sp\.className='fic';sp\.style\.setProperty\('--m','url\("'\+u\+'"\)'\);el\.textContent='';el\.appendChild\(sp\)\}\);im\.src=u\}\)\}\)\(\);\n?/g;

let filesTouched = 0;
let dupRemoved = 0;
let cdnReplacements = 0;

for (const file of listHtmlFiles()) {
  let content = fs.readFileSync(file, 'utf8');
  const orig = content;

  content = content.replace(DUP_IIFE_RE, () => { dupRemoved++; return ''; });

  if (content.includes(CDN_BASE)) {
    // Depth-relative path back to the repo root (where /icons/ lives), based
    // on how many directory levels this file sits below the repo root.
    const rel = path.relative(path.dirname(file), REPO_ROOT).split(path.sep).filter(Boolean);
    const prefix = rel.length ? rel.map(() => '..').join('/') + '/' : './';
    const localIconsUrl = `${prefix}icons/`;
    const count = content.split(CDN_BASE).length - 1;
    content = content.split(CDN_BASE).join(localIconsUrl);
    cdnReplacements += count;
  }

  if (content !== orig) {
    fs.writeFileSync(file, content, 'utf8');
    filesTouched++;
  }
}

console.log(`Touched ${filesTouched} file(s). Removed ${dupRemoved} duplicate icon script(s). Replaced ${cdnReplacements} CDN URL reference(s) with local /icons/ paths.`);
