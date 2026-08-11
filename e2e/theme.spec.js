import { test, expect } from '@playwright/test';
import { seedSession, mockRest, mockStorage } from './helpers.js';

test.describe('Theme', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockRest(page);
    await mockStorage(page);
  });

  test('toggle flips the dark class on <html> and persists across routes', async ({ page }) => {
    await page.goto('/dashboard');

    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    await page.getByRole('switch', { name: 'Toggle dark mode' }).click();
    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole('link', { name: 'Merge PDF' }).click();
    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole('switch', { name: 'Toggle dark mode' }).click();
    await expect(html).toHaveClass(/dark/);

    const stored = await page.evaluate(() => localStorage.getItem('pdfnexus-theme'));
    expect(stored).toBe('dark');
  });
});