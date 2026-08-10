import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const loadPdf = (data) => PDFDocument.load(data);

const compress = async (data, { scale = 0.75, quality = 0.7 } = {}) => {
  const src = await pdfjsLib.getDocument({ data }).promise;
  const out = await PDFDocument.create();

  for (let i = 1; i <= src.numPages; i++) {
    const page = await src.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale });
    const canvas = new OffscreenCanvas(
      Math.max(1, Math.floor(viewport.width)),
      Math.max(1, Math.floor(viewport.height)),
    );
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    const img = await out.embedJpg(await blob.arrayBuffer());

    const outPage = out.addPage([base.width, base.height]);
    outPage.drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
    page.cleanup();
  }

  await src.destroy();
  return out.save();
};

const thumbs = async (data, { width = 180 } = {}) => {
  const src = await pdfjsLib.getDocument({ data }).promise;
  const blobs = [];

  for (let i = 1; i <= src.numPages; i++) {
    const page = await src.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(1, width / base.width) });
    const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    await page.render({ canvasContext: ctx, viewport }).promise;
    blobs.push(await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 }));
    page.cleanup();
  }

  await src.destroy();
  return blobs;
};

const merge = async (data) => {
  const out = await PDFDocument.create();
  for (const buf of data) {
    const pdf = await loadPdf(buf);
    const copied = await out.copyPages(pdf, pdf.getPageIndices());
    copied.forEach((page) => out.addPage(page));
  }
  return out.save();
};

const split = async (data, { pages } = {}) => {
  const src = await loadPdf(data);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pages.map((p) => p - 1));
  copied.forEach((page) => out.addPage(page));
  return out.save();
};

const convert = async (data, { types } = {}) => {
  const out = await PDFDocument.create();
  for (let i = 0; i < data.length; i++) {
    const image = types[i] === 'image/png' ? await out.embedPng(data[i]) : await out.embedJpg(data[i]);
    const page = out.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  return out.save();
};

const rotate = async (data, { rotations } = {}) => {
  const pdf = await loadPdf(data);
  pdf.getPages().forEach((page, index) => {
    const delta = rotations[index];
    if (delta) page.setRotation(degrees(page.getRotation().angle + delta));
  });
  return pdf.save();
};

const watermark = async (data, options = {}) => {
  const { text = 'CONFIDENTIAL', fontSizePct = 8, opacity = 0.25, color = '#000000', diagonal = true } = options;
  const pdf = await loadPdf(data);
  const cache = new Map();

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const key = `${Math.round(width)}x${Math.round(height)}`;
    let embedded = cache.get(key);
    if (!embedded) {
      const canvas = new OffscreenCanvas(Math.ceil(width), Math.ceil(height));
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
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      embedded = await pdf.embedPng(await blob.arrayBuffer());
      cache.set(key, embedded);
    }
    page.drawImage(embedded, { x: 0, y: 0, width, height });
  }

  return pdf.save();
};

const reorder = async (data, { order } = {}) => {
  const src = await loadPdf(data);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  copied.forEach((page) => out.addPage(page));
  return out.save();
};

const sign = async (data, { img, x, y, width, height, isJpeg } = {}) => {
  const pdf = await loadPdf(data);
  const embedded = isJpeg ? await pdf.embedJpg(img) : await pdf.embedPng(img);
  const firstPage = pdf.getPages()[0];
  firstPage.drawImage(embedded, { x, y, width, height });
  return pdf.save();
};

const OPS = { compress, thumbs, merge, split, convert, rotate, watermark, reorder, sign };

const transferOf = (result) => {
  if (result instanceof ArrayBuffer) return [result];
  if (result instanceof Uint8Array) return [result.buffer];
  return [];
};

self.onmessage = async (e) => {
  const { id, type, data, options } = e.data || {};
  try {
    const op = OPS[type];
    if (!op) throw new Error(`Unsupported request: ${type}`);
    const result = await op(data, options);
    self.postMessage({ id, type: `${type}-ok`, data: result }, transferOf(result));
  } catch (error) {
    self.postMessage({ id, type: `${type}-err`, message: error.message || String(error) });
  }
};