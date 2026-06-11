import { test, expect } from '@playwright/test';

const ROUTES = [
  { path: '/', title: /資產總覽|Overview|AI資產配置/ },
  { path: '/allocation', title: /目標配置/ },
  { path: '/rebalance', title: /配置平衡/ },
  { path: '/retirement', title: /退休.*FIRE/ },
  { path: '/family', title: /家庭規劃/ },
  { path: '/order', title: /下單股數/ },
  { path: '/backtest', title: /歷史回測/ },
  { path: '/frontier', title: /效率前緣/ },
  { path: '/scenario', title: /壓力測試/ },
  { path: '/stresstest', title: /脫水測試/ },
];

test.describe('Navigation', () => {
  for (const route of ROUTES) {
    test(`${route.path} loads and displays title`, async ({ page }) => {
      await page.goto(`/#${route.path}`);
      await expect(page.locator('h1')).toContainText(route.title);
    });
  }

  test('navbar has all menu items', async ({ page }) => {
    await page.goto('/');
    const navLinks = page.locator('nav a');
    await expect(navLinks.first()).toBeVisible();
    // Should see at least 8 nav links on desktop
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });
});
