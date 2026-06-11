import { test, expect } from '@playwright/test';

test('retirement page loads and shows heatmap', async ({ page }) => {
  await page.goto('/#/retirement');
  await expect(page.locator('h1')).toContainText(/退休/);
  // Wait for Monte Carlo simulation to complete
  await page.waitForTimeout(2000);
  // Check for the heatmap section
  await expect(page.locator('text=退休提領壓力熱圖').first()).toBeVisible();
});
