#!/usr/bin/env node
/* tools/thisweek-check.js — fails if brief/latest/index.html ("This week")
 * shows an older week than the newest date actually present in
 * issues/issues.json (excluding Executive issues, which are a separate
 * edition and never the "This week"/"All Industries" page's subject — see
 * FH54 root-cause notes in scripts/build-brief-latest.js).
 *
 * Added FH54, after the "Rebuild Brief 'This week'" CI workflow silently
 * left brief/latest/ frozen on a stale week because an Executive issue's
 * mislabeled "edition" field hijacked the "newest All Industries issue"
 * lookup. This check is the regression guard for that class of bug: it
 * never hard-codes a date/issue — it always re-derives "the newest week"
 * straight from issues.json and compares it against whatever week string
 * is actually published on the live "This week" page.
 * Usage: node tools/thisweek-check.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { REPO_ROOT } = require('./lib');

const issuesPath = path.join(REPO_ROOT, 'issues', 'issues.json');
const briefLatestPath = path.join(REPO_ROOT, 'brief', 'latest', 'index.html');

function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dow = d.getUTCDay();
  const daysSinceMonday = (dow + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d;
}
function weekLabel(dateStr) {
  const monday = mondayOf(dateStr);
  return `Week of ${monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
}

let failures = 0;

if (!fs.existsSync(issuesPath)) {
  console.log(`MISSING: ${issuesPath}`);
  process.exit(1);
}
if (!fs.existsSync(briefLatestPath)) {
  console.log(`MISSING: ${briefLatestPath}`);
  process.exit(1);
}

const issues = JSON.parse(fs.readFileSync(issuesPath, 'utf8'));
// Executive issues are a distinct edition; never the newest "This week" date.
const nonExecDates = issues.filter((i) => !i.exec).map((i) => i.date);
if (!nonExecDates.length) {
  console.log('FAIL: issues.json has no non-Executive issues to compare against');
  failures++;
} else {
  const newestDate = [...nonExecDates].sort().reverse()[0];
  const expectedWeek = weekLabel(newestDate);

  const html = fs.readFileSync(briefLatestPath, 'utf8');
  const weekMatches = [...html.matchAll(/Week of [A-Za-z]+ \d{1,2}, \d{4}/g)].map((m) => m[0]);

  if (!weekMatches.length) {
    console.log(`FAIL: brief/latest/index.html has no "Week of ..." text to check (expected "${expectedWeek}")`);
    failures++;
  } else {
    const stale = weekMatches.filter((w) => w !== expectedWeek);
    if (stale.length) {
      console.log(`FAIL: brief/latest/index.html shows "${stale[0]}" but issues.json's newest non-Executive issue date (${newestDate}) is "${expectedWeek}"`);
      failures++;
    } else {
      console.log(`PASS: brief/latest/index.html shows the newest week (${expectedWeek}, from ${newestDate})`);
    }
  }
}

process.exit(failures ? 1 : 0);
