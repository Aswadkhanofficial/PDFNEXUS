import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PDFDocument } from 'pdf-lib';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('worker tools: split + convert run through the pdf worker', async ({ page }) => {
  const tmp = mkdtempSync(join(tmpdir(), 'wtools-'));
  const twoPagePath = join(tmp, 'two.pdf');
  {
    const doc = await PDFDocument.create();
    doc.addPage([400, 600]);
    doc.addPage([200, 200]);
    writeFileSync(twoPagePath, Buffer.from(await doc.save()));
  }

  // /split — thumbnails arrive as blob: URLs (worker path, not data: fallback)
  await page.goto('/split');
  await page.locator('input[accept="application/pdf"]').setInputFiles(twoPagePath);
  await expect(page.locator('img[src^="blob:"][alt="Page 1"]')).toBeVisible({ timeout: 30000 });
  await page.locator('img[alt="Page 2"]').click();
  await expect(page.getByText('2 pages', { exact: false })).toBeVisible();

  const splitDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /Extract Selected Pages/ }).click();
  await expect(page.getByText('Your selected pages were extracted successfully.')).toBeVisible({ timeout: 30000 });
  await page.getByRole('link', { name: 'Download PDF' }).click();
  const splitOut = await splitDownload;
  const splitPath = join(tmp, 'split.pdf');
  await splitOut.saveAs(splitPath);
  {
    const out = await PDFDocument.load(readFileSync(splitPath));
    expect(out.getPageCount()).toBe(1);
    const { width, height } = out.getPages()[0].getSize();
    expect([Math.round(width), Math.round(height)]).toEqual([200, 200]);
  }

  // /convert — two PNGs -> two pages
  await page.goto('/convert');
  await page.locator('input[accept="image/jpeg,image/png"]').setInputFiles([
    { name: 'a.png', mimeType: 'image/png', buffer: tinyPng },
    { name: 'b.png', mimeType: 'image/png', buffer: tinyPng },
  ]);
  const convertDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /Convert to PDF/ }).click();
  await expect(page.getByText('Your images were converted successfully.')).toBeVisible({ timeout: 30000 });
  await page.getByRole('link', { name: 'Download PDF' }).click();
  const convertOut = await convertDownload;
  const convertPath = join(tmp, 'images.pdf');
  await convertOut.saveAs(convertPath);
  {
    const out = await PDFDocument.load(readFileSync(convertPath));
    expect(out.getPageCount()).toBe(2);
  }
});