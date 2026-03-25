import { test, expect } from '@playwright/test';

test.describe('Routes protégées', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure user is logged out
    await page.goto('/');
    await page.evaluate(() => {
      // Clear any Supabase auth tokens
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
    });
  });

  test('/commande redirige vers /connexion si non connecté', async ({ page }) => {
    await page.goto('/commande');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/connexion/);
  });

  test('/compte redirige vers /connexion si non connecté', async ({ page }) => {
    await page.goto('/compte');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/connexion/);
  });

  test('/admin redirige vers / si non connecté', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    // AdminRoute redirects to "/" — either home or connexion
    const url = page.url();
    expect(url).not.toContain('/admin');
  });

  test('/pos redirige vers / si non connecté', async ({ page }) => {
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).not.toContain('/pos');
  });

  test('la page de connexion est accessible publiquement', async ({ page }) => {
    await page.goto('/connexion');
    await expect(page).toHaveURL(/connexion/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
