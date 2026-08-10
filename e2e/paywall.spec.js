import { test, expect } from '@playwright/test';

test.describe('Paywall guest gate', () => {
  test('guest gets 1 free action, then is forced to the signup gate', async ({ page }) => {
    await page.goto('/compress');
    await expect(page.getByText('1 free uses left', { exact: true })).toBeVisible();

    const file = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 100 100]/Parent 2 0 R/Contents 4 0 R>>endobj\n4 0 obj<</Length 0>>stream\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000200 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n303\n%%EOF\n');
    await page.locator('input[accept="application/pdf"]').setInputFiles({
      name: 'tiny.pdf', mimeType: 'application/pdf', buffer: file,
    });
    await page.getByRole('button', { name: /Compress PDF/ }).click();
    await expect(page.getByText('Your PDF was compressed successfully.')).toBeVisible({ timeout: 90000 });
    await expect(page.locator('a', { hasText: 'Download PDF' })).toBeVisible();

    await page.goto('/compress');
    await expect(page.getByRole('heading', { name: 'One Free Action Used' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create Free Account' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Log in/ })).toBeVisible();
  });
});