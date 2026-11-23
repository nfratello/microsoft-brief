#!/usr/bin/env node
/* tools/console-check.js — loads given pages (local static server by
 * default, or --live to hit config.liveBase) and reports any browser
 * console errors / page errors, ignoring favicon 404s (console network
 * errors for a URL containing "favicon" are not real script errors anyway,
 * but pages are also allowed to lack a favicon without failing this check).
 * Usage: node tools/console-check.js [--live] [path/to/page.html ...] */
'use strict';
const path = require('path');
const { startStaticServer, launchBrowser, REPO_ROOT } = require('./lib');
const config = require('./config');

async function main() {
  const args = process.argv.slice(2);
  const live = args.includes('--live');
  const pages = args.filter((a) => a !== '--live').length ? args.filter((a) => a !== '--live') : config.pages;

  let server, port;
  if (!live) ({ server, port } = await startStaticServer());
  const browser = await launchBrowser();
  let anyErrors = false;
  try {
    for (const p of pages) {
      const url = live ? config.liveBase + p : `http://127.0.0.1:${port}/${p}`;
      const page = await browser.newPage();
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !/favicon/i.test(msg.text())) errors.push('console: ' + msg.text());
      });
      page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
      page.on('requestfailed', (req) => {
        if (!/favicon/i.test(req.url())) errors.push('requestfailed: ' + req.url() + ' (' + (req.failure() && req.failure().errorText) + ')');
      });
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      console.log(`${p} (${url}): ${errors.length === 0 ? 'OK, 0 errors' : errors.length + ' error(s)'}`);
      errors.forEach((e) => console.log('  ' + e));
      if (errors.length) anyErrors = true;
      await page.close();
    }
  } finally {
    await browser.close();
    if (server) server.close();
  }
  if (anyErrors) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(2); });
