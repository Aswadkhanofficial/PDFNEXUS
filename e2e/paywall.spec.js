import { test, expect } from '@playwright/test';

const tinyPdf = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 100 100]/Parent 2 0 R/Contents 4 0 R>>endobj\n4 0 obj<</Length 0>>stream\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000200 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n303\n%%EOF\n',
);

test.describe('Paywall guest gate', () => {
  test('guest gets exactly 3 free actions per feature, then is forced to the signup gate', async ({ page }) => {
    await page.goto('/compress');
    await expect(page.getByText('3 free uses left', { exact: true })).toBeVisible();

    const compressOnce = async () => {
      await page.locator('input[accept="application/pdf"]').setInputFiles({
        name: 'tiny.pdf', mimeType: 'application/pdf', buffer: tinyPdf,
      });
      await page.getByRole('button', { name: /Compress PDF/ }).click();
      await expect(page.getByText('Your PDF was compressed successfully.')).toBeVisible({ timeout: 90000 });
    };

    // Uses 1 and 2 are allowed and decrement the badge
    await compressOnce();
    await expect(page.getByText('2 free uses left', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Compress Another PDF/ }).click();
    await compressOnce();
    await expect(page.getByText('1 free uses left', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Compress Another PDF/ }).click();

    // Use 3 consumes the budget and swaps the tool for the signup gate
    await page.locator('input[accept="application/pdf"]').setInputFiles({
      name: 'tiny.pdf', mimeType: 'application/pdf', buffer: tinyPdf,
    });
    await page.getByRole('button', { name: /Compress PDF/ }).click();
    await expect(page.getByRole('heading', { name: 'You have used your 3 free actions for this tool.' })).toBeVisible({ timeout: 90000 });
    await expect(page.getByRole('link', { name: 'Create Free Account' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Already have an account? Log in' })).toBeVisible();

    // The budget is per feature: merge is untouched
    await page.goto('/merge');
    await expect(page.getByText('3 free uses left', { exact: true })).toBeVisible();

    // 4th entry to compress is still blocked, worker never runs
    await page.goto('/compress');
    await expect(page.getByRole('heading', { name: 'You have used your 3 free actions for this tool.' })).toBeVisible();
    await expect(page.locator('input[accept="application/pdf"]')).toHaveCount(0);
  });
});