import { test, expect } from '@playwright/test';

test.describe('Boutique / Catalogue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('ageVerified', 'true');
    });
  });

  test('la page catalogue se charge', async ({ page }) => {
    await page.goto('/catalogue');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/catalogue/);
  });

  test('affiche des produits ou un message vide', async ({ page }) => {
    await page.goto('/catalogue');
    await page.waitForLoadState('networkidle');
    // Either product cards, empty state, or category bento
    const hasProducts = await page.locator('[data-testid="product-card"], .product-card, article').count();
    const hasEmpty = await page.locator('text=/aucun produit|pas de produit|empty/i').count();
    const hasBento = await page.locator('text=/gammes|collections/i').count();
    expect(hasProducts + hasEmpty + hasBento).toBeGreaterThan(0);
  });

  test('les filtres de catégorie sont présents', async ({ page }) => {
    await page.goto('/catalogue');
    await page.waitForLoadState('networkidle');
    // Category filter buttons/links
    const filters = page.locator('button, a').filter({ hasText: /fleurs|huiles|résines|infusions|CBD/i });
    const count = await filters.count();
    expect(count).toBeGreaterThan(0);
  });

  test('la navigation vers un produit fonctionne', async ({ page }) => {
    await page.goto('/catalogue');
    await page.waitForLoadState('networkidle');
    // Click on the first product link
    const productLink = page.locator('a[href*="/catalogue/"]').first();
    const count = await productLink.count();
    if (count > 0) {
      await productLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/catalogue\//);
    }
  });
});
