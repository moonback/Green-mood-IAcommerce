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
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/catalogue/);
  });

  test('affiche des produits ou un message vide', async ({ page }) => {
    await page.goto('/catalogue');
    await page.waitForLoadState('domcontentloaded');
    
    const products = page.locator('[data-testid="product-card"], .product-card, article').first();
    const emptyState = page.locator('text=/aucun produit|pas de produit|empty/i').first();
    const bento = page.locator('text=/gammes|collections/i').first();
    
    await expect(products.or(emptyState).or(bento)).toBeVisible({ timeout: 10_000 });
  });

  test('les filtres de catégorie sont présents', async ({ page }) => {
    await page.goto('/catalogue');
    await page.waitForLoadState('domcontentloaded');
    
    const filters = page.locator('button, a').filter({ hasText: /fleurs|huiles|résines|infusions|CBD/i }).first();
    await expect(filters).toBeVisible({ timeout: 10_000 });
  });

  test('la navigation vers un produit fonctionne', async ({ page }) => {
    await page.goto('/catalogue');
    await page.waitForLoadState('domcontentloaded');
    
    const productLink = page.locator('a[href*="/catalogue/"]').first();
    await expect(productLink).toBeVisible({ timeout: 10_000 });
    await productLink.click();
    await expect(page).toHaveURL(/\/catalogue\//, { timeout: 10_000 });
  });
});
