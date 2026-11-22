#!/usr/bin/env node
/* tools/overlap-check.js — P44: catches the "font grows, line-height
 * doesn't" class of bug (overlapping headline lines, text running off its
 * container) before it ships, plus a static guard against reintroducing a
 * px line-height in a <style> block.
 *
 * Two parts:
 *  1. Rendered check (needs real layout, so it launches a browser): for
 *     every configured page, at every configured width (config.widths —
 *     390/768/1024/1440/1920), flags any text element whose rendered lines
 *     overlap each other, or whose content runs wider than the viewport
 *     (horizontal overflow/clipping).
 *  2. Static check: scans every <style> block in every HTML file for a px
 *     line-height. Exempts the one known, deliberate exception — the
 *     email-page mobile breakpoint's `.h1{font-size:26px!important;
 *     line-height:32px!important}` inside `@media (max-width:620px)`,
 *     documented in frontier-style.css — since email clients need an exact
 *     px line-height at that one breakpoint; every other px line-height in
 *     a <style> block is flagged.
 *
 * Usage: node tools/overlap-check.js [path/to/page.html ...]  (defaults to config.pages) */
'use strict';
const fs = require('fs');
const path = require('path');
const { startStaticServer, launchBrowser, listHtmlFiles, REPO_ROOT } = require('./lib');
const config = require('./config');

const OVERLAP_CHECK_FN = `() => {
  const results = [];
  // Headings and paragraph-level text only — buttons/badges are deliberately
  // excluded: their accessible name often spans an icon + label in separate
  // inline fragments, which produces harmless multi-rect geometry that isn't
  // the "font bigger than its own line box" bug this check targets.
  const sel = 'h1,h2,h3,h4,h5,p,li';
  document.querySelectorAll(sel).forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const text = (el.textContent || '').trim();
    if (!text) return;
    const fontSize = parseFloat(cs.fontSize);
    const lineHeight = parseFloat(cs.lineHeight);
    if (!fontSize || !lineHeight || cs.lineHeight === 'normal') return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
    const lineCount = new Set(rects.map((r) => Math.round(r.top))).size;
    if (lineCount < 2) return; // single line: a too-small line-height can't overlap anything
    if (lineHeight < fontSize * 0.95) {
      results.push({
        tag: el.tagName,
        cls: el.className,
        text: text.slice(0, 60),
        issue: \`line-height \${lineHeight.toFixed(1)}px smaller than font-size \${fontSize.toFixed(1)}px across \${lineCount} lines (will overlap)\`,
      });
    }
  });
  const scrollW = document.documentElement.scrollWidth;
  const viewW = window.innerWidth;
  if (scrollW > viewW + 15) {
    results.push({ tag: 'BODY', cls: '', text: '', issue: \`horizontal overflow (\${scrollW}px content in \${viewW}px viewport)\` });
  }
  return results;
}`;

// The one deliberate, documented px line-height exception (email mobile
// breakpoint) — see frontier-style.css's "Issue / email pages (P44)" note.
const ALLOWED_PX_LINE_HEIGHT = /\.h1\{font-size:26px!important;line-height:32px!important\}/;

function staticPxLineHeightScan() {
  const files = listHtmlFiles();
  const hits = [];
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const styleBlocks = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
    for (const block of styleBlocks) {
      let working = block;
      const allowed = working.match(ALLOWED_PX_LINE_HEIGHT);
      if (allowed) working = working.replace(ALLOWED_PX_LINE_HEIGHT, '');
      const matches = working.match(/line-height:\s*\d+(\.\d+)?px/gi) || [];
      if (matches.length) hits.push({ file: path.relative(REPO_ROOT, file), count: matches.length });
    }
  }
  return hits;
}

async function renderedOverlapScan(pages) {
  const { server, port } = await startStaticServer();
  const browser = await launchBrowser();
  const findings = [];
  try {
    for (const p of pages) {
      for (const width of config.widths) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } });
        await page.goto(`http://127.0.0.1:${port}/${p}`, { waitUntil: 'load' });
        // eslint-disable-next-line no-eval
        const found = await page.evaluate(new Function('return ' + OVERLAP_CHECK_FN)());
        if (found.length) findings.push({ page: p, width, found });
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  return findings;
}

async function main() {
  const pages = process.argv.slice(2).length ? process.argv.slice(2) : config.pages;

  const pxHits = staticPxLineHeightScan();
  if (pxHits.length) {
    console.log('Static px-line-height-in-<style> scan:');
    pxHits.forEach((h) => console.log(`  ${h.file}: ${h.count} px line-height(s) in a <style> block`));
  } else {
    console.log('Static px-line-height-in-<style> scan: clean.');
  }

  const findings = await renderedOverlapScan(pages);
  let total = 0;
  for (const f of findings) {
    console.log(`\n${f.page} @ ${f.width}px:`);
    f.found.forEach((x) => {
      console.log(`  [${x.tag}${x.cls ? '.' + x.cls : ''}] ${x.issue}${x.text ? ' "' + x.text + '"' : ''}`);
    });
    total += f.found.length;
  }

  const grandTotal = total + pxHits.reduce((a, h) => a + h.count, 0);
  console.log(`\n${total} rendered overlap/clip issue(s) across ${pages.length} page(s) at ${config.widths.length} widths; ${pxHits.reduce((a, h) => a + h.count, 0)} unexempted px line-height(s) in <style> blocks.`);
  process.exit(grandTotal ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
