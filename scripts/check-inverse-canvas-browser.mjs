// Run with IV_PLAYWRIGHT_PATH pointing to an existing Playwright installation.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.IV_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.IV_PREVIEW_URL || 'http://127.0.0.1:4186';
const output = new URL('../.playwright-mcp/inverse-canvas/', import.meta.url).pathname.replace(/^\/(?=[A-Z]:)/, '');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const check = label => console.log(`PASS ${label}`);
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/page-transitions`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByRole('heading', { name: 'Page Transitions', exact: true }).waitFor();
  assert.equal(await page.locator('iframe').count(), 0);
  await page.screenshot({ path: `${output}/gallery.png`, fullPage: true });
  await page.locator('a[href="/gallery/inverse-canvas"]').click();
  await page.getByRole('heading', { name: 'Inverse Canvas', exact: true }).waitFor();
  await page.frameLocator('iframe').locator('#flip').waitFor();
  let frame = page.frames().find(f => f.url().includes('/experiments/inverse-canvas/index.html'));
  await page.waitForTimeout(300);
  const parentTheme = await page.locator('html').getAttribute('data-theme');
  await frame.locator('#flip').click();
  await frame.waitForFunction(() => document.getAnimations().some(a => a.id === 'inverse-old'));
  const count = await frame.locator('html').getAttribute('data-inverse-tiles');
  assert.ok(Number(count) > 100);
  await frame.evaluate(() => document.getAnimations().filter(a => a.id.startsWith('inverse-')).forEach(a => { a.pause(); a.currentTime = 825; }));
  await page.screenshot({ path: `${output}/wave-desktop.png` });
  await frame.evaluate(() => document.getAnimations().filter(a => a.id.startsWith('inverse-')).forEach(a => a.play()));
  await frame.waitForFunction(() => !document.documentElement.hasAttribute('data-inverse-transition'));
  assert.equal(await frame.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await page.locator('html').getAttribute('data-theme'), parentTheme);
  check('gallery route, actual snapshot animation and shell isolation');
  await page.screenshot({ path: `${output}/dark-desktop.png`, fullPage: true });

  const timeOrigin = await frame.evaluate(() => performance.timeOrigin);
  await page.getByRole('button', { name: 'Fine grain', exact: true }).click();
  await frame.waitForFunction(() => document.documentElement.dataset.palette === 'violet');
  assert.equal(await frame.evaluate(() => performance.timeOrigin), timeOrigin);
  await frame.locator('#flip').click();
  await frame.waitForFunction(() => document.getAnimations().some(a => a.id === 'inverse-old'));
  assert.ok(Number(await frame.locator('html').getAttribute('data-inverse-tiles')) > Number(count));
  await frame.locator('#flip').press('Escape');
  await frame.waitForFunction(() => !document.documentElement.hasAttribute('data-inverse-transition'));
  assert.equal(await frame.locator('#flip').isDisabled(), false);
  check('presets increase density without reloading; Escape cleans up');

  // Both native snapshots and the grid resolve to the chosen theme on failure.
  await frame.evaluate(() => { document.startViewTransition = () => ({ ready: Promise.reject(new Error('test capture failure')), skipTransition() {} }); });
  await frame.locator('#flip').click();
  await frame.waitForFunction(() => document.documentElement.dataset.theme === 'dark' && !document.querySelector('#flip').disabled);
  assert.equal(await frame.locator('.inverse-lattice').count(), 0);
  check('capture failure settles the chosen theme and releases controls');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download settings JSON' }).click();
  const download = await downloadPromise;
  const json = JSON.parse(readFileSync(await download.path(), 'utf8'));
  assert.equal(json.tileCount, 1120);
  assert.equal(json.mode, 'transition');
  const bundle = await page.request.get(`${base}/experiments/inverse-canvas/inverse-canvas.zip`);
  assert.equal(bundle.status(), 200);
  assert.equal((await bundle.body()).subarray(0, 2).toString(), 'PK');
  check('portable bundle and current settings download');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/gallery/inverse-canvas`, { waitUntil: 'networkidle' });
  await page.frameLocator('iframe').locator('#flip').waitFor();
  frame = page.frames().find(f => f.url().includes('/experiments/inverse-canvas/index.html'));
  await page.waitForTimeout(250);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.ok(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await frame.locator('#flip').click();
  await frame.waitForFunction(() => document.documentElement.dataset.theme === 'dark' && !document.querySelector('#flip').disabled);
  await page.screenshot({ path: `${output}/dark-mobile.png`, fullPage: true });
  await page.getByTitle('Expand to fullscreen').click();
  await page.waitForTimeout(300);
  await frame.locator('#flip').click();
  await frame.waitForFunction(() => document.documentElement.dataset.theme === 'light' && !document.querySelector('#flip').disabled);
  await page.getByTitle('Exit fullscreen (Esc)').click();
  check('390px controls, no horizontal overflow, fullscreen and return flip');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await frame.locator('#flip').click();
  assert.equal(await frame.locator('.inverse-lattice').count(), 0);
  assert.equal(await frame.locator('html').getAttribute('data-theme'), 'dark');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await frame.evaluate(() => { document.startViewTransition = undefined; });
  await frame.locator('#flip').click();
  assert.equal(await frame.locator('html').getAttribute('data-theme'), 'light');
  check('reduced motion and unsupported-browser immediate fallbacks');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${base}/gallery/pixel-field`, { waitUntil: 'networkidle' });
  await page.frameLocator('iframe').locator('#replay').waitFor();
  frame = page.frames().find(f => f.url().includes('/experiments/inverse-canvas/index.html'));
  await frame.locator('#replay').click();
  await frame.waitForFunction(() => { const c = document.querySelector('canvas'); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0); });
  assert.equal(await frame.locator('html').getAttribute('data-theme'), 'light');
  await page.screenshot({ path: `${output}/hover-field.png` });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await frame.waitForFunction(() => { const c = document.querySelector('canvas'); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.every((v, i) => i % 4 !== 3 || v === 0); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await frame.locator('#replay').click();
  assert.equal(await frame.evaluate(() => { const c = document.querySelector('canvas'); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0); }), false);
  check('hover pulses behind content, offscreen cleanup and reduced motion');
  assert.deepEqual(errors, []);
  check('no uncaught browser errors');
} finally {
  await browser.close();
}
