import { test, expect } from '@playwright/test';
import { makePdf } from './helpers.js';

test.describe('PDF Merge', () => {
  test('merges two uploaded PDFs and exposes the download link', async ({ page }) => {
    await page.goto('/merge');

    await page.setInputFiles('input[type="file"]', [
      { name: 'first.pdf', mimeType: 'application/pdf', buffer: await makePdf('First PDF') },
      { name: 'second.pdf', mimeType: 'application/pdf', buffer: await makePdf('Second PDF') },
    ]);

    await expect(page.getByText('2 file(s) selected')).toBeVisible();
    await page.getByRole('button', { name: 'Next Step' }).click();
    await page.getByRole('button', { name: 'Merge in this order' }).click();

    await expect(page.getByRole('heading', { name: 'Merge PDFs' })).toBeVisible();
    await expect(page.locator('a[download="PDFNexus_Merged.pdf"]')).toBeVisible();
  });

  test('rejects non-PDF uploads with a warning', async ({ page }) => {
    await page.goto('/merge');

    let alertText = '';
    page.on('dialog', (dialog) => {
      alertText = dialog.message();
      dialog.accept();
    });

    await page.setInputFiles('input[type="file"]', [
      { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') },
      { name: 'ok.pdf', mimeType: 'application/pdf', buffer: await makePdf('OK') },
    ]);

    await expect.poll(() => alertText).toBe('Only PDF files are allowed.');
    await expect(page.getByText('1 file(s) selected')).toBeVisible();
  });
});