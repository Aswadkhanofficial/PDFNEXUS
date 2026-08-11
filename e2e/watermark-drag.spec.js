import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('watermark drag keeps the dashed box and watermark text in sync', async ({ page }) => {
  const pdf = await PDFDocument.create();
  pdf.addPage([600, 800]);
  const dir = mkdtempSync(join(tmpdir(), 'wm-drag-'));
  const filePath = join(dir, 'wm.pdf');
  writeFileSync(filePath, await pdf.save());

  await page.goto('/watermark');
  await page.locator('input[accept="application/pdf"]').setInputFiles(filePath);
  await page.locator('input[type="text"]').fill('TOP SECRET');

  const box = page.locator('.react-draggable');
  const text = page.locator('[data-testid="watermark-overlay"]');
  await expect(box).toBeVisible();
  await expect(text).toBeVisible();
  await box.scrollIntoViewIfNeeded();

  const beforeBox = await box.boundingBox();
  const beforeText = await text.boundingBox();

  const cx = beforeBox.x + beforeBox.width / 2;
  const cy = beforeBox.y + beforeBox.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 120, cy + 60, { steps: 6 });

  const duringBox = await box.boundingBox();
  const duringText = await text.boundingBox();
  await page.mouse.up();

  const boxDx = duringBox.x - beforeBox.x;
  const boxDy = duringBox.y - beforeBox.y;
  const textDx = duringText.x - beforeText.x;
  const textDy = duringText.y - beforeText.y;

  expect(boxDx).toBeGreaterThan(80);
  expect(boxDy).toBeGreaterThan(30);
  expect(Math.abs(textDx - boxDx)).toBeLessThan(2);
  expect(Math.abs(textDy - boxDy)).toBeLessThan(2);
});
