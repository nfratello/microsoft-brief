#!/usr/bin/env node
/* tools/screenshots.js — captures configured pages at 1920/1440/1240/1024/390
 * px into tools/screenshots/ (gitignored, never published). Uses the local
 * static server + playwright-core/msedge (no browser download).
 * Usage: node tools/screenshots.js [path/to/page.html ...] */
'use strict';
const fs = require('fs');
const path = require('path');
const { startStaticServer, launchBrowser, REPO_ROOT } = require('./lib');
const config = require('./config');

async function main() {
  const pages = process.argv.slice(2).length ? process.argv.slice(2) : config.pages;
  const outDir = path.join(__dirname, 'screenshots');
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
