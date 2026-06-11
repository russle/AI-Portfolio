import { test, expect } from '@playwright/test';

test('stress test page can select regime and run test', async ({ page }) => {
  await page.goto('/#/stresstest');
  await expect(page.locator('h1')).toContainText(/脫水測試/);
  // Click a regime card
  await page.locator('text=日本失落十年').click();
  // Click the run button
  await page.locator('button', { hasText: '開始脫水測試' }).click();
  // Wait for results to appear
  await page.waitForTimeout(1500);
  // Check results section appears
  await expect(page.locator('text=壓力測試結果').first()).toBeVisible();
});
