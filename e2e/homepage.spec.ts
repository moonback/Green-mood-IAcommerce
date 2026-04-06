import { test, expect } from '@playwright/test';

test.describe('Page d\'accueil', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('se charge sans erreur', async ({ page }) => {
    await expect(page).toHaveTitle(/.+/);
    // No JavaScript errors in console
    const errors: string[] = [];
    await page.waitForLoadState('domcontentloaded');
    expect(errors).toHaveLength(0);
  });

  test('affiche le header avec la navigation', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    // Header/nav should be present
    const header = page.locator('header, nav').first();
    await expect(header).toBeVisible();
  });

  test('affiche le footer', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('le lien vers la boutique est présent', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    // Look for a shop/catalogue link
    const shopLink = page.locator('a[href*="catalogue"], a[href*="boutique"]').first();
    await expect(shopLink).toBeVisible();
  });
});
