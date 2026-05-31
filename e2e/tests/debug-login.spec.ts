import { test, expect } from '@playwright/test';

test('warga login flow debug', async ({ page }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  page.on('request', (req) => requests.push(`[req] ${req.method()} ${req.url()}`));
  page.on('response', async (res) => {
    if (res.url().includes('/auth/')) {
      const body = await res.text().catch(() => '');
      requests.push(`[res ${res.status()}] ${res.url()} body=${body.slice(0, 200)}`);
    }
  });

  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/warga-before.png' });

  console.log('--- HTML after load ---');
  console.log(await page.content().then((c) => c.slice(0, 500)));

  const hpInput = page.locator('input[type="tel"]');
  const pwInput = page.locator('input[type="password"]');
  await expect(hpInput).toBeVisible({ timeout: 5000 });

  await hpInput.fill('081234567890');
  await pwInput.fill('Masuk123@');
  await page.locator('button[type="submit"]').click();

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/warga-after.png' });

  console.log('=== requests ===');
  requests.forEach((r) => console.log(r));
  console.log('=== errors ===');
  errors.forEach((e) => console.log(e));
  console.log('=== final URL ===', page.url());
  console.log('=== final HTML head ===');
  console.log(await page.content().then((c) => c.slice(0, 1500)));
});

test('dinas login flow debug', async ({ page }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  page.on('request', (req) => requests.push(`[req] ${req.method()} ${req.url()}`));
  page.on('response', async (res) => {
    if (res.url().includes('/auth/')) {
      const body = await res.text().catch(() => '');
      requests.push(`[res ${res.status()}] ${res.url()} body=${body.slice(0, 200)}`);
    }
  });

  await page.goto('http://localhost:5174/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/dinas-before.png' });

  const hpInput = page.locator('input[type="tel"]');
  const pwInput = page.locator('input[type="password"]');
  await expect(hpInput).toBeVisible({ timeout: 5000 });

  await hpInput.fill('081111111111');
  await pwInput.fill('Masuk123@');
  await page.locator('button[type="submit"]').click();

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/dinas-after.png' });

  console.log('=== requests ===');
  requests.forEach((r) => console.log(r));
  console.log('=== errors ===');
  errors.forEach((e) => console.log(e));
  console.log('=== final URL ===', page.url());
});
