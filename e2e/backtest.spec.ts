import { test, expect } from '@playwright/test';

test('backtest page loads and runs single backtest', async ({ page }) => {
  await page.goto('/#/backtest');
  await expect(page.locator('h2')).toContainText(/歷史回測/);
  // Wait for backtest to complete
  await page.waitForTimeout(3000);
  // Check metrics cards appear
  await expect(page.locator('text=年化報酬率').first()).toBeVisible();
});

test('switching to rolling mode shows sliders', async ({ page }) => {
  await page.goto('/#/backtest');
  // Click the rolling mode toggle
  const rollingBtn = page.locator('button', { hasText: '滾動回測' });
  await rollingBtn.click();
  // Verify rolling parameter sliders appear
  await expect(page.locator('text=視窗大小').first()).toBeVisible();
  await expect(page.locator('text=步長').first()).toBeVisible();
});
