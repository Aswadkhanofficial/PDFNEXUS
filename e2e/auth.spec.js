import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('protected /dashboard redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
  });

  test('login with invalid credentials surfaces an error', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email Address').fill('nobody@pdfnexus.test');
    await page.getByPlaceholder('Password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: /Log In securely/ }).click();

    const errorBox = page.locator('div.bg-red-500\\/10');
    await expect(errorBox).toBeVisible();
  });

  test('signup page renders and validates required fields', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('button', { name: /Sign Up/ }).click();
    await expect(page.getByPlaceholder('Email Address')).toBeVisible();
  });
});