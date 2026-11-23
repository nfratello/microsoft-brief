#!/usr/bin/env node
/* tools/join-numbers-units.js — P33 follow-up to P22/numbers-check.js.
 * Joins a number to the unit/time word right after it with &nbsp; so the two
 * never wrap onto separate lines, in VISIBLE PROSE TEXT ONLY (headings,
 * ledes, paragraphs, list items, buttons, card text, captions).
 *
 * Units/time words covered: AM, PM, minutes/minute, seconds/second,
 * hours/hour, days/day, weeks/week, months/month, years/year, %, KB, MB, GB.
 * Also joins a month name to the day (or day range) right after it, e.g.
 * "November 17-20" -> "November&nbsp;17-20", "Dec 8-11" -> "Dec&nbsp;8-11".
 *
 * Never touches: <script>, <style>, <svg>...</svg>, <code>/<pre> samples,
 * tag attributes, CSS values or URLs — only text between tags, outside those
 * elements. Splits only on ASCII space/tab when matching (never \s, which
 * would also match the \u00A0 this script itself inserts — the P22 note).
 *
 * Usage: node tools/join-numbers-units.js        (apply + report counts)
 *        node tools/join-numbers-units.js --dry   (report only, no writes)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { listHtmlFiles, REPO_ROOT } = require('./lib');

const NBSP = '\u00A0';
const DRY = process.argv.includes('--dry');

// Elements whose entire text content must never be touched.
const OPAQUE_TAGS = ['script', 'style', 'svg', 'code', 'pre'];

const UNIT_ALT = ['AM', 'PM', 'minutes', 'minute', 'seconds', 'second', 'hours', 'hour',
  'days', 'day', 'weeks', 'week', 'months', 'month', 'years', 'year', 'KB', 'MB', 'GB'].join('|');
// Number + unit word, joined by one or more plain ASCII spaces/tabs. Case
// insensitive so headline/title-case usage ("10 Hours") is caught too —
// safe because the preceding-digit requirement already rules out ordinary
// words like "am" in "I am...".
const NUM_UNIT_RE = new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)[ \\t]+(${UNIT_ALT})\\b`, 'gi');
// Number + percent sign (percent has no trailing \b since % isn't a word char).
const NUM_PCT_RE = /(\d[\d,]*(?:\.\d+)?)[ \t]+(%)/g;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December', 'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul',
  'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec'];
const MONTH_ALT = MONTHS.join('|');
// Month name + day or day-range right after it, joined by plain spaces/tabs.
const MONTH_DAY_RE = new RegExp(`\\b(${MONTH_ALT})[ \\t]+(\\d{1,2}(?:[-\u2013]\\d{1,2})?)\\b`, 'g');

/** Build a same-length boolean mask: true = plain text between tags, outside
 *  any opaque element and outside any tag's own markup (so offsets line up
 *  1:1 with the original string for safe in-place substitution). */
function editableMask(html) {
  const mask = new Array(html.length).fill(false);
  let i = 0;
  let inTag = false;
  const opaqueStack = [];
  while (i < html.length) {
    const ch = html[i];
    if (!inTag && ch === '<') {
      // Check for a closing tag of the current opaque element.
      const tagMatch = /^<\/?([a-zA-Z0-9]+)/.exec(html.slice(i));
      const tagName = tagMatch ? tagMatch[1].toLowerCase() : null;
      const isClose = html[i + 1] === '/';
      inTag = true;
      if (isClose && opaqueStack.length && tagName === opaqueStack[opaqueStack.length - 1]) {
        opaqueStack.pop();
      } else if (!isClose && OPAQUE_TAGS.includes(tagName)) {
        opaqueStack.push(tagName);
      }
      mask[i] = false;
      i++;
      continue;
    }
    if (inTag) {
      mask[i] = false;
      if (ch === '>') inTag = false;
      i++;
      continue;
    }
    mask[i] = opaqueStack.length === 0;
    i++;
  }
  return mask;
}

/** Apply a regex, but only accept/perform a replacement when every character
 *  the match spans is editable per `mask`. Returns { text, count }. */
function replaceEditable(text, mask, re, build) {
  let count = 0;
  let out = '';
  let last = 0;
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text))) {
    const start = m.index;
    const end = start + m[0].length;
    let allEditable = true;
    for (let k = start; k < end; k++) {
      if (!mask[k]) { allEditable = false; break; }
    }
    if (allEditable) {
      out += text.slice(last, start) + build(m);
      last = end;
      count++;
    }
    // else: leave as-is, keep scanning (handled by the final slice copy below).
  }
  out += text.slice(last);
  return { text: out, count };
}

function processFile(file) {
  const html = fs.readFileSync(file, 'utf8');
  const mask = editableMask(html);

  let working = html;
  let total = 0;

  let r = replaceEditable(working, editableMask(working), NUM_UNIT_RE, (m) => `${m[1]}${NBSP}${m[2]}`);
  working = r.text; total += r.count;

  r = replaceEditable(working, editableMask(working), NUM_PCT_RE, (m) => `${m[1]}${NBSP}${m[2]}`);
  working = r.text; total += r.count;

  r = replaceEditable(working, editableMask(working), MONTH_DAY_RE, (m) => `${m[1]}${NBSP}${m[2]}`);
  working = r.text; total += r.count;

  if (total > 0 && !DRY) fs.writeFileSync(file, working, 'utf8');
  return total;
}

module.exports = { editableMask, replaceEditable, NUM_UNIT_RE, NUM_PCT_RE, MONTH_DAY_RE };

function main() {
  let grandTotal = 0;
  const perFile = [];
  for (const file of listHtmlFiles()) {
    const n = processFile(file);
    if (n > 0) {
      perFile.push({ file: path.relative(REPO_ROOT, file), n });
      grandTotal += n;
    }
  }
  perFile.sort((a, b) => b.n - a.n);
  for (const { file, n } of perFile) console.log(`${file}: ${n} join(s)`);
  console.log(`\n${grandTotal} number/unit join(s) ${DRY ? 'would be made' : 'made'} in ${path.basename(REPO_ROOT)}.`);
}

if (require.main === module) main();
