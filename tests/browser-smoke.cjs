const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

(async () => {
  assert.ok(process.env.CHROME_BIN, 'Set CHROME_BIN to an installed Chrome/Chromium executable');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // External fonts are optional; verify the portfolio works without them.
    await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
    const response = await page.goto(process.env.BASE_URL || 'http://127.0.0.1:8080/');
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => document.querySelector('[data-el="c-name"]')?.textContent !== '—');
    assert.equal(await page.locator('[data-el="list"] button').count(), 8);
    for (const width of [1440, 1024, 760, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);
      const size = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, canvas: document.querySelector('#router').getBoundingClientRect().width }));
      assert.ok(size.page <= size.viewport, `Horizontal overflow at ${width}px: ${size.page}`);
      assert.ok(size.canvas > 0 && size.canvas < width);
    }
    await page.locator('[data-el="word"]').fill('security');
    await page.waitForFunction(() => document.querySelector('[data-el="s-tok"]').textContent.startsWith('"security"'));
    await page.locator('[data-el="list"] button').first().click();
    assert.equal(await page.locator('[data-el="c-name"]').textContent(), 'upstage-cli');
    await page.locator('[data-el="c-pin"]').click();
    assert.equal(await page.locator('[data-el="list"] button').first().getAttribute('aria-pressed'), 'false');
    await page.locator('#router').focus();
    await page.keyboard.press('ArrowRight');
    const broken = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.getElementById(a.getAttribute('href').slice(1))).map(a => a.getAttribute('href')));
    assert.deepEqual(broken, []);
    assert.deepEqual(errors, []);
    console.log('Browser: desktop/mobile layout, input, pinning, keyboard and section links passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
