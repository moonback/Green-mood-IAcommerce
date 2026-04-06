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
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/connexion/);
  });

  test('/compte redirige vers /connexion si non connecté', async ({ page }) => {
    await page.goto('/compte');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/connexion/);
  });

  test('/admin redirige vers / ou /connexion si non connecté', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/admin/, { timeout: 10_000 });
  });

  test('/pos redirige vers / ou /connexion si non connecté', async ({ page }) => {
    await page.goto('/pos');
    await expect(page).not.toHaveURL(/pos/, { timeout: 10_000 });
  });

  test('la page de connexion est accessible publiquement', async ({ page }) => {
    await page.goto('/connexion');
    await expect(page).toHaveURL(/connexion/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
