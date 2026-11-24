// FH56 step A.3: append the new All Industries Issue No. 3 entry to the
// `const ISSUES=[...]` array embedded in issues/index.html (the source of
// truth — see scripts/build-issues-manifest.js). Append-only: never remove
// or reorder existing entries. Also bumps the .stats pill (issue count +1).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const indexPath = path.join(ROOT, 'issues', 'index.html');

const newEntry = {
  url: '2026-11-24-all-industries-003.html',
  title: 'Copilot that remembers, reads your business apps, and shows what agents cost',
  edition: 'All Industries',
  date: '2026-11-24',
  nice: 'Nov 24, 2026',
  label: 'Issue No. 3',
  exec: false,
  acc: '#0067b8',
  deep: '#0b2a4a',
  icon: 'globe',
  emoji: '🌐',
  q: [
    'Can Copilot remember how your team works?',
    'What can Copilot do with your business apps?',
    'What does each of your agents really cost?'
  ],
  prods: ['Microsoft 365 Copilot', 'Dynamics 365', 'Microsoft Foundry'],
  rt: '3 min read',
  get: '../#editions',
  img: 'th-all-industries-003.jpg',
  ind: 'All industries',
  c: '#0067b8',
  fi: 'globe',
  em: '🌐',
  kind: 'Issue No. 3',
  mon: 'NOV',
  day: 24,
  k3: [
    'Copilot now remembers how you work',
    'Copilot can now read your business apps',
    'See what every agent costs, and cap it'
  ],
  cta: 'Read the issue',
  first: false,
  week: 'Week of November 23, 2026',
  lede: 'Copilot that remembers, reads your business apps, and shows what agents cost'
};

let html = fs.readFileSync(indexPath, 'utf8');
const m = html.match(/const ISSUES=(\[.*?\]);/s);
if (!m) throw new Error('ISSUES array not found');
const arr = JSON.parse(m[1]);

if (arr.some((x) => x.url === newEntry.url)) {
  console.log('Entry already present, skipping append:', newEntry.url);
} else {
  arr.unshift(newEntry); // newest first, matching existing ordering convention
  const newArrayLiteral = JSON.stringify(arr);
  html = html.replace(/const ISSUES=\[.*?\];/s, `const ISSUES=${newArrayLiteral};`);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Appended new entry. ISSUES array now has', arr.length, 'entries.');
}

// Bump the stats pill: issue count +1 (55 -> 56). Editions count (13) and
// Executive count (2) are unaffected since this is an existing edition.
const statsRe = /<div class="stats"><span><b>(\d+)<\/b> issues<\/span>(.*?)<\/div>/s;
const sm = html.match(statsRe);
if (!sm) throw new Error('stats div not found');
const oldCount = parseInt(sm[1], 10);
const newCount = oldCount + 1;
if (oldCount === 56) {
  console.log('Stats pill already shows 56 issues, skipping.');
} else {
  html = html.replace(statsRe, `<div class="stats"><span><b>${newCount}</b> issues</span>${sm[2]}</div>`);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log(`Stats pill issue count bumped: ${oldCount} -> ${newCount}`);
}
