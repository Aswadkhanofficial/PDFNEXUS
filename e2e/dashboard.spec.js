import { test, expect } from '@playwright/test';
import { seedSession, mockRest, mockStorage, DOC_FIXTURES } from './helpers.js';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockRest(page);
    await mockStorage(page);
  });

  test('lists the user documents from the API', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Recent Files' })).toBeVisible();
    for (const doc of DOC_FIXTURES) {
      await expect(page.getByText(doc.file_name, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('240.0 KB')).toHaveCount(2);
  });

  test('shows the tool grid', async ({ page }) => {
    await page.goto('/dashboard');

    for (const name of ['Merge PDF', 'Split PDF', 'Compress PDF', 'E-Sign']) {
      await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();
    }
  });

  test('deletes a document after confirmation', async ({ page }) => {
    await page.goto('/dashboard');

    page.once('dialog', (dialog) => dialog.accept());

    const row = page.getByText(DOC_FIXTURES[0].file_name, { exact: true }).locator('xpath=ancestor::div[contains(@class,"grid")][1]');
    await row.getByTitle('Delete').click();

    await expect(page.getByText(DOC_FIXTURES[0].file_name, { exact: true })).toHaveCount(0);
    await expect(page.getByText(DOC_FIXTURES[1].file_name, { exact: true })).toBeVisible();
  });

  test('shows the empty state when no documents exist', async ({ page }) => {
    await mockRest(page, { docs: [] });
    await page.goto('/dashboard');

    await expect(page.getByText('No files yet')).toBeVisible();
  });
});