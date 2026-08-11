import { test, expect } from '@playwright/test';
import { PDFDocument, rgb } from 'pdf-lib';
import { randomBytes } from 'node:crypto';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

// 1024x1024 genuine-noise RGB PNG (~3MB raw, incompressible -> large PDF)
const makeNoisePng = () => {
  const w = 1024;
  const h = 1024;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    randomBytes(w * 3).copy(raw, y * (w * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const noisePng = () => Buffer.from(makeNoisePng());

let show = process.env.PW_SHOW === '1';

test('tools: compress, rotate, watermark, reorder + site parity', async ({ page }) => {
  test.setTimeout(180000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });

  const tmp = mkdtempSync(join(tmpdir(), 'tools-'));
  const bigPdfPath = join(tmp, 'big.pdf');
  show = true;
  void show;

  // --- big noisy PDF (single page, ~4MB+) for compress ---
  {
    const doc = await PDFDocument.create();
    const img = await doc.embedPng(noisePng());
    const pageSrc = doc.addPage([595, 842]);
    pageSrc.drawImage(img, { x: 0, y: 0, width: 595, height: 842 });
    writeFileSync(bigPdfPath, await doc.save());
  }
  const bigSize = readFileSync(bigPdfPath).length;
  expect(bigSize).toBeGreaterThan(2_000_000);

  // --- 3-page varying-size PDF for rotate/reorder ---
  const sizesPath = join(tmp, 'sizes.pdf');
  {
    const doc = await PDFDocument.create();
    const p1 = doc.addPage([400, 600]);
    p1.drawRectangle({ x: 50, y: 50, width: 100, height: 60, borderColor: rgb(1, 0, 0), borderWidth: 3 });
    const p2 = doc.addPage([200, 200]);
    p2.drawRectangle({ x: 30, y: 30, width: 50, height: 40, borderColor: rgb(0, 1, 0), borderWidth: 3 });
    const p3 = doc.addPage([700, 300]);
    p3.drawRectangle({ x: 80, y: 60, width: 120, height: 40, borderColor: rgb(0, 0, 1), borderWidth: 3 });
    writeFileSync(sizesPath, await doc.save());
  }

  // ================= /compress =================
  await page.goto('/compress');
  await page.locator('input[accept="application/pdf"]').setInputFiles(bigPdfPath);
  await page.getByRole('button', { name: /Strong/ }).click();
  const workerHit = new Promise((resolve) => {
    page.on('request', (r) => {
      if (r.url().includes('pdfWorker')) resolve(true);
    });
  });
  await page.getByRole('button', { name: /Compress PDF/ }).click();
  await expect(page.getByText('Processing in a background worker')).toBeVisible();
  await expect(workerHit).resolves.toBe(true);
  try {
    await expect(page.getByText('Your PDF was compressed successfully.')).toBeVisible({ timeout: 90000 });
    const compressDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: /Download PDF/ }).click();
    const compressed = await compressDownload;
    const compressedPath = join(tmp, 'compressed.pdf');
    await compressed.saveAs(compressedPath);
    const compSize = readFileSync(compressedPath).length;
    expect(compSize).toBeLessThan(bigSize * 0.35);
  } catch (e) {
    console.log('COMPRESS_STUCK', JSON.stringify({ errors, bodyStart: (await page.locator('body').innerText()).slice(0, 600) }));
    throw e;
  }

  // ================= /rotate =================
  await page.goto('/rotate');
  await page.locator('input[accept="application/pdf"]').setInputFiles(sizesPath);
  await expect(page.getByText('3 page(s)')).toBeVisible({ timeout: 20000 });
  const page1Tile = page.locator('img[alt="Page 1"]').locator('xpath=ancestor::div[contains(@class,"flex flex-col")][1]');
  const cwButton = page1Tile.locator('button[title="Rotate clockwise"]');
  await cwButton.click();
  await expect(page1Tile.getByText('90°')).toBeVisible();
  const rotateDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /Apply Rotations/ }).click();
  await expect(page.getByText('Your pages were rotated successfully.')).toBeVisible({ timeout: 30000 });
  await page.getByRole('link', { name: /Download PDF/ }).click();
  const rotated = await rotateDownload;
  const rotatedPath = join(tmp, 'rotated.pdf');
  await rotated.saveAs(rotatedPath);
  {
    const out = await PDFDocument.load(readFileSync(rotatedPath));
    const angles = out.getPages().map((p) => p.getRotation().angle);
    expect(angles).toEqual([90, 0, 0]);
  }

  // ================= /watermark =================
  await page.goto('/watermark');
  await page.locator('input[accept="application/pdf"]').setInputFiles(sizesPath);
  await page.locator('input[type="text"]').fill('TOP SECRET');
  await expect(page.locator('input[type="text"]')).toHaveValue('TOP SECRET');
  await expect(page.locator('[data-testid="watermark-overlay"]')).toBeVisible();
  const wmDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /Apply Watermark/ }).click();
  await expect(page.getByText('Your watermark was applied successfully.')).toBeVisible({ timeout: 30000 });
  await page.getByRole('link', { name: /Download PDF/ }).click();
  const watermarked = await wmDownload;
  const wmPath = join(tmp, 'wm.pdf');
  await watermarked.saveAs(wmPath);
  {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await getDocument({ data: new Uint8Array(readFileSync(wmPath)), useWorkerFetch: false, isEvalSupported: false }).promise;
    expect(pdf.numPages).toBe(3);
    let imgPaints = 0;
    for (let i = 1; i <= 3; i++) {
      const pg = await pdf.getPage(i);
      const { argsArray } = await pg.getOperatorList();
      imgPaints += argsArray.filter((a) => a && a.length === 1 && typeof a[0] === 'string' && a[0].startsWith('img')).length;
    }
    expect(imgPaints).toBeGreaterThanOrEqual(3);
  }

  // ================= /reorder =================
  await page.goto('/reorder');
  await page.locator('input[accept="application/pdf"]').setInputFiles(sizesPath);
  await expect(page.getByText('3 pages', { exact: true })).toBeVisible({ timeout: 20000 });
  const tiles = page.locator('[draggable="true"]');
  await tiles.nth(0).evaluate((el) => {
    const dt = new DataTransfer();
    el.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
  });
  await tiles.nth(2).evaluate((el) => {
    const dt = new DataTransfer();
    el.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: dt }));
    el.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt, cancelable: true }));
    el.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt, cancelable: true }));
  });
  await tiles.nth(0).evaluate((el) => {
    const dt = new DataTransfer();
    el.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
  });
  await page.waitForTimeout(300);
  await expect(page.locator('[draggable="true"]').nth(0).getByText('P2')).toBeVisible();
  const reorderDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /Apply New Order/ }).click();
  await expect(page.getByText('Your pages were reordered successfully.')).toBeVisible({ timeout: 30000 });
  await page.getByRole('link', { name: /Download PDF/ }).click();
  const reordered = await reorderDownload;
  const reorderedPath = join(tmp, 'reordered.pdf');
  await reordered.saveAs(reorderedPath);
  {
    const out = await PDFDocument.load(readFileSync(reorderedPath));
    const sizes = out.getPages().map((p) => `${Math.round(p.getSize().width)}x${Math.round(p.getSize().height)}`);
    expect(sizes).toEqual(['200x200', '700x300', '400x600']);
  }

  // ================= Phase 3: content parity audit =================
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const banned of ['ocr', 'coming soon', 'word to pdf', 'excel', 'powerpoint', 'rotates pdfs for you']) {
    expect(body).not.toContain(banned);
  }
  for (const tool of ['merge pdfs', 'split pdf', 'compress pdf', 'rotate pdf', 'watermark pdf', 'reorder pages', 'image to pdf', 'e-sign document']) {
    expect(body).toContain(tool);
  }
  expect(body).toContain('8');
  await expect(page.locator('a[href="/tools/compress"]').first()).toBeVisible();
  await expect(page.locator('a[href="/tools/rotate"]').first()).toBeVisible();
  await expect(page.locator('a[href="/tools/watermark"]').first()).toBeVisible();
  await expect(page.locator('a[href="/tools/reorder"]').first()).toBeVisible();

  expect(errors).toEqual([]);
});