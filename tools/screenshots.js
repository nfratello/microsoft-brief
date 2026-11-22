#!/usr/bin/env node
/* tools/screenshots.js — captures configured pages at every tools/config.js
 * width (390/768/1024/1440/1920) into a dated tools/screenshots/<date>/
 * folder (gitignored, never published) so each sweep is kept distinct from
 * the last. Uses the local static server + playwright-core/msedge (no
 * browser download).
 * Usage: node tools/screenshots.js [path/to/page.html ...] */
'use strict';
const fs = require('fs');
const path = require('path');
const { startStaticServer, launchBrowser, REPO_ROOT } = require('./lib');
const config = require('./config');

async function main() {
  const pages = process.argv.slice(2).length ? process.argv.slice(2) : config.pages;
  const dateStamp = new Date().toISOString().slice(0, 10);
  const outDir = path.join(__dirname, 'screenshots', dateStamp);
  fs.mkdirSync(outDir, { recursive: true });
  const { server, port } = await startStaticServer();
  const browser = await launchBrowser();
  try {
    for (const p of pages) {
      for (const width of config.widths) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } });
        await page.goto(`http://127.0.0.1:${port}/${p}`, { waitUntil: 'load' });
        const safe = p.replace(/[\\/]/g, '_').replace(/\.html$/, '');
        const file = path.join(outDir, `${safe}-${width}.png`);
        await page.screenshot({ path: file });
        console.log(`wrote ${path.relative(REPO_ROOT, file)}`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
}
main().catch((e) => { console.error(e); process.exit(2); });
