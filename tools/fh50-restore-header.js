// FH50 one-time repair script.
// Commit d252382 (the immediate parent of FH49's 4256290) bulk-reverted the shared Frontier
// header (<header class="gh">, Becoming Frontier / The Brief / The Hub / The Coach nav, #0f6cbd
// Subscribe, and the Brief's row-2 section bar) back to the old pre-shared-header markup
// (<header class="snav">, "The Brief" logo, Copilot Coach / Industries / Products / Customer
// stories / Events / Issues / How it's built nav, orange Subscribe) on every page in the repo,
// and dropped the <link rel="stylesheet" href=".../frontier-style.css"> tag that carries the
// .gh/.ghr/.gnav/.lb/.mstrip rules, replacing it with an old inline <style id="snav-css"> block.
// FH49 then built new work (Fluent icons, Copilot+Dynamics 365 lockup) on top of these already
// -broken pages without noticing.
//
// This script restores, file by file, the header region (CSS link + <header class="gh">...
// </header>) from the last known-good revision of the SAME file (commit 837c9f4, the parent of
// d252382) into the current file, leaving every other part of the file (including FH49's and
// d252382's legitimate content changes) untouched.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const GOOD_REV = '837c9f4';

const SNAV_BLOCK_RE = /<!--snav-->[\s\S]*?<!--\/snav-->/;
const OLD_LINK_RE = /<link rel="stylesheet" href="[^"]*frontier-style\.css[^"]*">/;
const GOOD_HEADER_RE = /<header class="gh">[\s\S]*?<\/header>/;

function listAffectedFiles() {
  const out = execSync('git grep -l "<header class=\\"snav\\">" -- "*.html"', { cwd: repoRoot, encoding: 'utf8' });
  return out.split(/\r?\n/).filter(Boolean);
}

function getGoodRevision(file) {
  try {
    return execSync(`git show ${GOOD_REV}:"${file}"`, { cwd: repoRoot, encoding: 'utf8' });
  } catch (e) {
    return null;
  }
}

function restoreFile(file, apply) {
  const curPath = path.join(repoRoot, file);
  const current = fs.readFileSync(curPath, 'utf8');
  const good = getGoodRevision(file);
  if (good == null) return { file, status: 'skipped (no good revision found)' };

  const linkMatch = good.match(OLD_LINK_RE);
  const headerMatch = good.match(GOOD_HEADER_RE);
  if (!linkMatch || !headerMatch) return { file, status: 'skipped (good revision missing link or header)' };

  if (!SNAV_BLOCK_RE.test(current)) return { file, status: 'skipped (no snav block found in current file)' };

  let updated = current.replace(SNAV_BLOCK_RE, headerMatch[0]);
  if (!current.includes(linkMatch[0])) {
    updated = updated.replace('</head>', `${linkMatch[0]}</head>`);
  }

  if (updated === current) return { file, status: 'no change' };
  if (apply) fs.writeFileSync(curPath, updated, 'utf8');
  return { file, status: apply ? 'fixed' : 'would fix' };
}

function main() {
  const apply = process.argv.includes('--apply');
  const files = listAffectedFiles();
  const results = files.map((f) => restoreFile(f, apply));
  const summary = {};
  for (const r of results) summary[r.status] = (summary[r.status] || 0) + 1;
  console.log(`Processed ${results.length} files.`);
  console.log(summary);
  const problems = results.filter((r) => r.status.startsWith('skipped'));
  if (problems.length) {
    console.log('Problems:');
    for (const p of problems) console.log(` - ${p.file}: ${p.status}`);
  }
}

main();
