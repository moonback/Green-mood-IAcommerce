import { test, expect } from '@playwright/test';

test.describe('Authentification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('ageVerified', 'true');
    });
  });

  test('la page de connexion s\'affiche correctement', async ({ page }) => {
    await page.goto('/connexion');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    // Submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('affiche une erreur avec des identifiants invalides', async ({ page }) => {
    await page.goto('/connexion');
    await page.fill('input[type="email"]', 'fake@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // Should show an error message
    await expect(
      page.locator('text=/incorrect|erreur|Email ou mot de passe/i').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('le lien "Mot de passe oublié" est présent', async ({ page }) => {
    await page.goto('/connexion');
    const forgotLink = page.locator('a[href*="mot-de-passe"], a[href*="forgot"], a[href*="password"]').first();
    await expect(forgotLink).toBeVisible();
  });

  test('le formulaire d\'inscription est accessible', async ({ page }) => {
    await page.goto('/connexion');
    // Should have a register link or toggle
    const registerLink = page.locator('a[href*="inscription"], button:has-text("inscription"), a:has-text("Créer")').first();
    await expect(registerLink).toBeVisible();
  });
});
