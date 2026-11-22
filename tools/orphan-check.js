#!/usr/bin/env node
/* tools/orphan-check.js — renders each configured page (via a local static
 * server + playwright-core/msedge) and flags any heading/button/card-title
 * whose last visual line is a single word with no &nbsp; joining it to the
 * previous word (the Design Standards "No orphans" rule). This needs real
 * layout, so it launches a browser — unlike the other checks here.
 * Usage: node tools/orphan-check.js [path/to/page.html ...]  (defaults to config.pages) */
'use strict';
const { startStaticServer, launchBrowser } = require('./lib');
const config = require('./config');

const CHECK_FN = `() => {
  const results = [];
  const sel = 'h1,h2,h3,h4,.btn,.card h3,.tile .eb,button,.wkeb,.eb';
  document.querySelectorAll(sel).forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const text = (el.textContent || '').trim();
    if (!text || text.split(/\\s+/).length < 2) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
    if (rects.length < 2) return; // single line, no orphan possible
    const last = rects[rects.length - 1];
    const prev = rects[rects.length - 2];
    const singleLineHeight = prev.height || last.height;
    // crude: last line much narrower than the line above it, and the raw text has no nbsp
    if (last.width < prev.width * 0.5 && !text.includes('\\u00A0')) {
      results.push({ tag: el.tagName, cls: el.className, text: text.slice(0, 70) });
    }
  });
  return results;
}`;

async function main() {
  const pages = process.argv.slice(2).length ? process.argv.slice(2) : config.pages;
  const { server, port } = await startStaticServer();
  const browser = await launchBrowser();
  let total = 0;
  try {
    for (const p of pages) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      await page.goto(`http://127.0.0.1:${port}/${p}`, { waitUntil: 'load' });
      // eslint-disable-next-line no-eval
      const found = await page.evaluate(new Function('return ' + CHECK_FN)());
      if (found.length) {
        console.log(`\n${p}:`);
        found.forEach((f) => console.log(`  [${f.tag}.${f.cls}] "${f.text}"`));
        total += found.length;
      }
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`\n${total} possible orphan(s) found across ${pages.length} page(s).`);
  process.exit(total ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
