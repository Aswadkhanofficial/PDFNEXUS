import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * pdf.js transfers (detaches) an ArrayBuffer it is handed. Copy the input so
 * callers can keep reusing the original bytes (e.g. for later pdf-lib work).
 */
const toSafeData = (bytes) => {
  const src = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const copy = new Uint8Array(src.byteLength);
  copy.set(src);
  return copy;
};

/**
 * Merges multiple PDF file arrays into a single PDF document.
 * @param {File[]} files - Array of PDF files from the input.
 * @returns {Promise<Uint8Array>} - The merged PDF as a byte array.
 */
export async function mergePdfs(files) {
  if (!files || files.length === 0) throw new Error("No files provided.");

  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    
    copiedPages.forEach((page) => {
      mergedPdf.addPage(page);
    });
  }

  return await mergedPdf.save();
}

/**
 * Extracts the given 1-based page numbers from a PDF into a new document.
 * @param {ArrayBuffer|Uint8Array} bytes - The source PDF bytes.
 * @param {number[]} pageNumbers - 1-based page numbers to keep.
 * @returns {Promise<Uint8Array>} - The extracted PDF as a byte array.
 */
export async function splitPdf(bytes, pageNumbers) {
  const srcPdf = await PDFDocument.load(bytes);
  const totalPages = srcPdf.getPageCount();
  const indexes = pageNumbers
    .filter((p) => p >= 1 && p <= totalPages)
    .map((p) => p - 1);

  if (indexes.length === 0) throw new Error('No valid pages selected.');

  const outPdf = await PDFDocument.create();
  const copiedPages = await outPdf.copyPages(srcPdf, indexes);
  copiedPages.forEach((page) => outPdf.addPage(page));

  return await outPdf.save();
}

/**
 * Converts multiple JPG/PNG image files into a single PDF (one page per image).
 * @param {File[]} files - The image files (image/jpeg or image/png).
 * @returns {Promise<Uint8Array>} - The generated PDF as a byte array.
 */
export async function imagesToPdf(files) {
  if (!files || files.length === 0) throw new Error('No images provided.');

  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.name}`);
    }
    const bytes = await file.arrayBuffer();
    const image = file.type === 'image/png'
      ? await pdfDoc.embedPng(bytes)
      : await pdfDoc.embedJpg(bytes);

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }

  return await pdfDoc.save();
}

/**
 * Removes a specific page from a PDF.
 * @param {File} file - The original PDF file.
 * @param {number} pageIndex - The 0-based index of the page to remove.
 * @returns {Promise<Uint8Array>} - The modified PDF as a byte array.
 */
export async function deletePdfPage(file, pageIndex) {
  if (!file) throw new Error("No file provided.");

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  const totalPages = pdf.getPageCount();
  if (pageIndex < 0 || pageIndex >= totalPages) {
    throw new Error("Invalid page index.");
  }

  pdf.removePage(pageIndex);
  return await pdf.save();
}

/**
 * Renders page thumbnails (JPEG data URLs) for preview grids.
 * @param {ArrayBuffer|Uint8Array} bytes - The source PDF bytes.
 * @param {number} thumbWidth - Target thumbnail width in px.
 * @returns {Promise<Array<{ page: number, url: string }>>}
 */
export async function renderThumbnails(bytes, thumbWidth = 160) {
  const pdf = await pdfjsLib.getDocument({ data: toSafeData(bytes) }).promise;
  const items = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1, thumbWidth / base.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    items.push({ page: i, url: canvas.toDataURL('image/jpeg', 0.7) });
    page.cleanup();
  }
  await pdf.destroy();
  return items;
}

/**
 * Re-encodes every page as an optimized JPEG (rasterized), shrinking file size.
 * @param {ArrayBuffer|Uint8Array} bytes - The source PDF bytes.
 * @param {{ scale?: number, quality?: number }} options - Lower scale/quality = smaller output.
 * @returns {Promise<Uint8Array>} - The compressed PDF bytes.
 */
export async function compressPdf(bytes, { scale = 0.75, quality = 0.7 } = {}) {
  const src = await pdfjsLib.getDocument({ data: toSafeData(bytes) }).promise;
  const out = await PDFDocument.create();

  for (let i = 1; i <= src.numPages; i++) {
    const page = await src.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    const img = await out.embedJpg(await blob.arrayBuffer());

    const outPage = out.addPage([base.width, base.height]);
    outPage.drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
    page.cleanup();
  }

  await src.destroy();
  return out.save();
}

/**
 * Rotates selected pages by the given clockwise degrees (90/180/270).
 * @param {ArrayBuffer|Uint8Array} bytes - The source PDF bytes.
 * @param {Record<number, number>} rotations - Map of page index -> degrees to add.
 * @returns {Promise<Uint8Array>} - The rotated PDF bytes.
 */
export async function rotatePdf(bytes, rotations) {
  const pdf = await PDFDocument.load(bytes);
  pdf.getPages().forEach((page, index) => {
    const delta = rotations[index];
    if (delta) {
      page.setRotation(degrees(page.getRotation().angle + delta));
    }
  });
  return pdf.save();
}

/**
 * Overlays a semi-transparent text watermark on every page.
 * @param {ArrayBuffer|Uint8Array} bytes - The source PDF bytes.
 * @param {{ text?: string, fontSizePct?: number, opacity?: number, color?: string, diagonal?: boolean }} options
 * @returns {Promise<Uint8Array>} - The watermarked PDF bytes.
 */
export async function watermarkPdf(bytes, options) {
  const { text = 'CONFIDENTIAL', fontSizePct = 8, opacity = 0.25, color = '#000000', diagonal = true } = options;
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages();
  const cache = new Map();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const key = `${Math.round(width)}x${Math.round(height)}`;
    let embedded = cache.get(key);
    if (!embedded) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width);
      canvas.height = Math.ceil(height);
      const ctx = canvas.getContext('2d');
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      const fontSize = Math.max(12, (width * fontSizePct) / 100);
      ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (diagonal) {
        ctx.translate(width / 2, height / 2);
        ctx.rotate(-Math.PI / 4);
        const gap = fontSize * 2.4;
        ctx.fillText(text, 0, 0);
        ctx.fillText(text, gap, 0);
        ctx.fillText(text, -gap, 0);
      } else {
        ctx.fillText(text, width / 2, height / 2);
      }
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      embedded = await pdf.embedPng(await blob.arrayBuffer());
      cache.set(key, embedded);
    }
    page.drawImage(embedded, { x: 0, y: 0, width, height });
  }

  return pdf.save();
}

/**
 * Reorders PDF pages into the given sequence.
 * @param {ArrayBuffer|Uint8Array} bytes - The source PDF bytes.
 * @param {number[]} newOrder - 0-based page indices in the desired order (must be a full permutation).
 * @returns {Promise<Uint8Array>} - The reordered PDF bytes.
 */
export async function reorderPdf(bytes, newOrder) {
  if (!newOrder || newOrder.length < 2) throw new Error('At least two pages are required to reorder.');
  const src = await PDFDocument.load(bytes);
  if (newOrder.length !== src.getPageCount()) throw new Error('Invalid page order.');
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, newOrder);
  copied.forEach((page) => out.addPage(page));
  return out.save();
}