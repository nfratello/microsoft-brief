// FH52 one-time functional test (not part of the permanent tools/ suite).
// Loads the shared header's copy-link button on several pages and exercises:
//  - click copies "https://aka.ms/MicrosoftBrief" to the clipboard
//  - "Copied" success state appears then reverts after ~2s
//  - rapid repeated clicks do not stack timers / get stuck
//  - keyboard activation (Enter/Space) works on the native <button>
//  - clipboard-unavailable fallback shows window.prompt with the URL
'use strict';
const { startStaticServer, launchBrowser } = require('./lib');

const PAGES = ['index.html', 'events/convergence/index.html', 'healthcare/index.html', 'issues/2026-11-09-defense-001.html'];

async function testPage(browser, port, p) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`http://127.0.0.1:${port}/${p}`, { waitUntil: 'load' });

  const btn = page.locator('header.gh .gnav > span.fw-bar button.aka').first();
  await btn.waitFor({ state: 'visible', timeout: 5000 });

  // Click copies the right URL
  await btn.click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  const label1 = await page.locator('header.gh .gnav > span.fw-bar button.aka .akl').first().textContent();
  const hasDone1 = await btn.evaluate((b) => b.classList.contains('done'));

  // Wait for revert (~1.6s per share-line.js; allow margin)
  await page.waitForTimeout(2000);
  const label2 = await page.locator('header.gh .gnav > span.fw-bar button.aka .akl').first().textContent();
  const hasDone2 = await btn.evaluate((b) => b.classList.contains('done'));

  // Rapid repeated clicks: must not get stuck showing "Copied"
  await btn.click();
  await page.waitForTimeout(100);
  await btn.click();
  await page.waitForTimeout(100);
  await btn.click();
  await page.waitForTimeout(2000);
  const labelAfterSpam = await page.locator('header.gh .gnav > span.fw-bar button.aka .akl').first().textContent();

  // Keyboard activation
  await btn.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  const doneAfterEnter = await btn.evaluate((b) => b.classList.contains('done'));
  await page.waitForTimeout(2000);
  await btn.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  const doneAfterSpace = await btn.evaluate((b) => b.classList.contains('done'));
  await page.waitForTimeout(2000);

  // Fallback path: stub navigator.clipboard to simulate blocked/unavailable clipboard
  let promptMessage = null;
  page.on('dialog', async (dialog) => {
    promptMessage = dialog.message();
    await dialog.dismiss();
  });
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });
  await btn.click();
  await page.waitForTimeout(500);

  await page.close();
  return {
    page: p,
    clip,
    label1,
    hasDone1,
    label2,
    hasDone2,
    labelAfterSpam,
    doneAfterEnter,
    doneAfterSpace,
    promptMessage,
  };
}

async function main() {
  const { server, port } = await startStaticServer();
  const browser = await launchBrowser();
  try {
    for (const p of PAGES) {
      const r = await testPage(browser, port, p);
      console.log(JSON.stringify(r, null, 2));
    }
  } finally {
    await browser.close();
    server.close();
  }
}
main().catch((e) => { console.error(e); process.exit(2); });
