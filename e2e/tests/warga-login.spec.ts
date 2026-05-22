import { expect, test } from '@playwright/test';

test.describe('Warga: login + create permohonan', () => {
  test('login → dashboard → buat permohonan baru', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Sipera — Masuk')).toBeVisible();

    await page.fill('input[type=tel]', '081234567890');
    await page.fill('input[type=password]', 'Masuk123@');
    await page.click('button[type=submit]');

    // Dashboard should appear
    await expect(page.getByText('Permohonan Saya')).toBeVisible({ timeout: 10_000 });

    // Click create
    await page.click('button:has-text("Permohonan Baru")');

    // New permohonan should appear in list
    await expect(page.locator('article').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('article').first()).toContainText('KKPR');
  });

  test('reject wrong password', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type=tel]', '081234567890');
    await page.fill('input[type=password]', 'wrong-password');
    await page.click('button[type=submit]');
    await expect(page.locator('div').filter({ hasText: 'API 401' }).first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
