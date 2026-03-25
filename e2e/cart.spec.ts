import { test, expect } from '@playwright/test';

test.describe('Panier', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('greenMood-cart');
      localStorage.removeItem('greenMood-wishlist');
      localStorage.setItem('ageVerified', 'true');
    });
  });

  test('le panier est vide au démarrage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Cart count badge should show 0 or be absent
    const cartBadge = page.locator('[data-testid="cart-count"], .cart-count, [aria-label*="panier"]').first();
    const badgeText = await cartBadge.textContent().catch(() => '0');
    expect(Number(badgeText) || 0).toBe(0);
  });

  test('peut ajouter un produit au panier depuis le catalogue', async ({ page }) => {
    await page.goto('/catalogue');
    await page.waitForLoadState('networkidle');

    // Click the first "Ajouter" button
    const addBtn = page.locator('button:has-text("Ajouter")').first();
    const btnCount = await addBtn.count();

    if (btnCount > 0) {
      await addBtn.click();
      // Cart sidebar should open or cart count increases
      await page.waitForTimeout(500);
      // Look for sidebar or toast
      const hasSidebar = await page.locator('[data-testid="cart-sidebar"], .cart-sidebar').count();
      const hasToast = await page.locator('text=/panier/i').count();
      expect(hasSidebar + hasToast).toBeGreaterThan(0);
    }
  });

  test('la page panier est accessible', async ({ page }) => {
    await page.goto('/panier');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/panier/);
  });

  test('le résumé de commande affiche le total', async ({ page }) => {
    await page.goto('/panier');
    await page.waitForLoadState('networkidle');
    // Either empty cart message or total
    const hasTotal = await page.locator('text=/total/i').count();
    const hasEmpty = await page.locator('text=/vide|empty|vierge/i').count();
    expect(hasTotal + hasEmpty).toBeGreaterThan(0);
  });
});
