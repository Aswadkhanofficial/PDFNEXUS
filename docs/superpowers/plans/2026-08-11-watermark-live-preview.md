# Live Watermark Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Watermark tool's fake preview with a live canvas overlay on the real PDF page — instant (<50ms) updates from the controls, with the exported file matching the preview exactly.

**Architecture:** A shared pure draw function (`drawWatermark`) is used by three consumers — the preview canvas overlay, the pdf-lib web worker, and the main-thread fallback engine — so preview and export are pixel-identical. The preview renders page 1 via react-pdf with a transparent canvas overlay sized in PDF-point coordinates; an invisible react-rnd controller div provides dragging, and position is stored as page-width/height percentages (`xPct/yPct`) so export needs no px→points conversion.

**Tech Stack:** React 19, Vite 8, react-pdf 10 (pdfjs-dist 5.4), pdf-lib 1.17, react-rnd 10.5, Tailwind 3, Playwright (e2e only — no unit test framework in repo).

## Global Constraints

- No new dependencies. Reuse `react-pdf`, `react-rnd`, `pdf-lib`, `pdfjs-dist` (all already in `package.json`).
- Design spec: `docs/superpowers/specs/2026-08-11-watermark-live-preview-design.md` — follow it exactly.
- The `watermark` worker op name and the fallback `watermarkPdf` export must keep their names (e2e + workerClient depend on them).
- Old `diagonal` option is removed everywhere; no backward-compat shim (its only caller is the rewritten page).
- No unit test framework exists — every task's verification gate is `npm run lint` + `npm run build`; the full behavioral gate is `npm run test:e2e` in Task 4.
- Existing style conventions: Tailwind utility classes with `dark:` variants, lucide-react icons, JSDoc on exported engine functions, no code comments unless necessary.
- Default watermark parameters (must match engine + UI): text `CONFIDENTIAL`, `fontSizePct` 8, `opacity` 25 (UI) = 0.25 (engine), `color` `#000000`, `rotation` -45, `xPct`/`yPct` 0.5.

---

### Task 1: Shared draw function + engine + worker (export path)

**Files:**
- Create: `src/utils/watermarkDraw.js`
- Modify: `src/services/pdfEngine.js:184-229` (the `watermarkPdf` function)
- Modify: `src/workers/pdfWorker.js:91-127` (the `watermark` op)

**Interfaces:**
- Produces: `drawWatermark(ctx, options)` — exported from `src/utils/watermarkDraw.js`. `ctx` is a `CanvasRenderingContext2D` or `OffscreenCanvasRenderingContext2D`. `options` = `{ width, height, text, fontSizePct, opacity, color, rotation, xPct = 0.5, yPct = 0.5 }` where `width`/`height` are in PDF points, `opacity` 0–1, `rotation` in degrees, `xPct`/`yPct` 0–1. Returns nothing.
- Produces: `watermarkPdf(bytes, options)` — unchanged name/signature shape; `options` now `{ text, fontSizePct, opacity, color, rotation, xPct, yPct }`.
- Produces: worker op `watermark(data, options)` — unchanged op name; same new `options` shape.

- [ ] **Step 1: Create the shared draw module**

Create `src/utils/watermarkDraw.js` (directory `src/utils/` does not exist yet — create it):

```js
export function drawWatermark(ctx, { width, height, text, fontSizePct, opacity, color, rotation, xPct = 0.5, yPct = 0.5 }) {
  const fontSize = Math.max(12, (width * fontSizePct) / 100);
  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.translate(width * xPct, height * yPct);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
```

- [ ] **Step 2: Rewrite `watermarkPdf` in `src/services/pdfEngine.js`**

Add the import at the top of the file (after the `pdfjsLib.GlobalWorkerOptions.workerSrc` line):

```js
import { drawWatermark } from '../utils/watermarkDraw';
```

Replace the entire `watermarkPdf` function (currently lines 184–229) with:

```js
/**
 * Overlays a semi-transparent text watermark on every page.
 * @param {ArrayBuffer|Uint8Array} bytes - The source PDF bytes.
 * @param {{ text?: string, fontSizePct?: number, opacity?: number, color?: string, rotation?: number, xPct?: number, yPct?: number }} options
 * @returns {Promise<Uint8Array>} - The watermarked PDF bytes.
 */
export async function watermarkPdf(bytes, options) {
  const {
    text = 'CONFIDENTIAL',
    fontSizePct = 8,
    opacity = 0.25,
    color = '#000000',
    rotation = -45,
    xPct = 0.5,
    yPct = 0.5,
  } = options;
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages();
  const cache = new Map();
  const safe = {
    text,
    fontSizePct: Math.max(0.5, Number(fontSizePct) || 8),
    opacity: Math.min(1, Math.max(0, Number(opacity) || 0.25)),
    color,
    rotation: Number(rotation) || 0,
    xPct: Math.min(1, Math.max(0, Number(xPct) || 0.5)),
    yPct: Math.min(1, Math.max(0, Number(yPct) || 0.5)),
  };

  if (!String(text).trim()) return pdf.save();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const key = `${Math.round(width)}x${Math.round(height)}`;
    let embedded = cache.get(key);
    if (!embedded) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width);
      canvas.height = Math.ceil(height);
      const ctx = canvas.getContext('2d');
      drawWatermark(ctx, { width, height, ...safe });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      embedded = await pdf.embedPng(await blob.arrayBuffer());
      cache.set(key, embedded);
    }
    page.drawImage(embedded, { x: 0, y: 0, width, height });
  }

  return pdf.save();
}
```

- [ ] **Step 3: Rewrite the `watermark` op in `src/workers/pdfWorker.js`**

Add the import at the top of the file (after the `pdfjsLib.GlobalWorkerOptions.workerSrc` line):

```js
import { drawWatermark } from '../utils/watermarkDraw';
```

Replace the entire `watermark` const (currently lines 91–127) with:

```js
const watermark = async (data, options = {}) => {
  const {
    text = 'CONFIDENTIAL',
    fontSizePct = 8,
    opacity = 0.25,
    color = '#000000',
    rotation = -45,
    xPct = 0.5,
    yPct = 0.5,
  } = options;
  const safe = {
    text,
    fontSizePct: Math.max(0.5, Number(fontSizePct) || 8),
    opacity: Math.min(1, Math.max(0, Number(opacity) || 0.25)),
    color,
    rotation: Number(rotation) || 0,
    xPct: Math.min(1, Math.max(0, Number(xPct) || 0.5)),
    yPct: Math.min(1, Math.max(0, Number(yPct) || 0.5)),
  };
  const pdf = await loadPdf(data);
  const cache = new Map();

  if (!String(safe.text).trim()) return pdf.save();

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const key = `${Math.round(width)}x${Math.round(height)}`;
    let embedded = cache.get(key);
    if (!embedded) {
      const canvas = new OffscreenCanvas(Math.ceil(width), Math.ceil(height));
      drawWatermark(canvas.getContext('2d'), { width, height, ...safe });
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      embedded = await pdf.embedPng(await blob.arrayBuffer());
      cache.set(key, embedded);
    }
    page.drawImage(embedded, { x: 0, y: 0, width, height });
  }

  return pdf.save();
};
```

- [ ] **Step 4: Verify lint and build**

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds; Vite bundles the worker with the new `../utils/watermarkDraw` import (worker bundling handles relative imports — the existing `pdfjs-dist` and `pdf-lib` imports already prove this path works).

- [ ] **Step 5: Commit**

```bash
git add src/utils/watermarkDraw.js src/services/pdfEngine.js src/workers/pdfWorker.js
git commit -m "feat: shared watermark draw function for preview and export"
```

---

### Task 2: WatermarkPreview component (canvas overlay + drag)

**Files:**
- Create: `src/components/WatermarkPreview.jsx`

**Interfaces:**
- Consumes: `drawWatermark` from `../utils/watermarkDraw` (Task 1).
- Consumes: `useToast` from `../components/Toast` (returns `{ error: toastError, ... }`).
- Consumes: `file` (a `File`), `options` (the live options object from the page: `{ text, fontSizePct, opacity, color, rotation, xPct, yPct }`), `onPositionChange({ xPct, yPct })` callback props.
- Produces: `<WatermarkPreview file={file} options={options} onPositionChange={fn} />` — self-contained live preview of page 1 with draggable watermark, "Page 1 of N" badge, and a `data-testid="watermark-overlay"` canvas (used by e2e in Task 4).

- [ ] **Step 1: Create the component**

Create `src/components/WatermarkPreview.jsx`:

```jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Rnd } from 'react-rnd';
import { FileText } from 'lucide-react';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { drawWatermark } from '../utils/watermarkDraw';
import { useToast } from './Toast';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_PREVIEW_WIDTH = 640;

export default function WatermarkPreview({ file, options, onPositionChange }) {
  const panelRef = useRef(null);
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const pageMetaRef = useRef(null);
  const [pageMeta, setPageMeta] = useState(null);
  const [pageCount, setPageCount] = useState(null);
  const [wrapSize, setWrapSize] = useState({ w: 0, h: 0 });
  const [pageWidth, setPageWidth] = useState(MAX_PREVIEW_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const { error: toastError } = useToast();

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const avail = el.clientWidth - 24;
      setPageWidth(Math.max(240, Math.min(MAX_PREVIEW_WIDTH, avail)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setWrapSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setPageMeta(null);
    setPageCount(null);
    pageMetaRef.current = null;
  }, [file]);

  const wmBox = useMemo(() => {
    if (!wrapSize.w || !pageMeta) return { w: 200, h: 60 };
    const fontSizePx = Math.max(12, (wrapSize.w * options.fontSizePct) / 100);
    const scratch = document.createElement('canvas');
    const sctx = scratch.getContext('2d');
    sctx.font = `bold ${fontSizePx}px Helvetica, Arial, sans-serif`;
    const w = Math.ceil(sctx.measureText(options.text || 'CONFIDENTIAL').width);
    return { w: Math.max(24, w + 8), h: Math.max(16, Math.ceil(fontSizePx)) };
  }, [wrapSize, pageMeta, options.fontSizePct, options.text]);

  const posPx = useMemo(() => {
    if (!wrapSize.w || !wrapSize.h) return null;
    return {
      x: Math.round(options.xPct * wrapSize.w - wmBox.w / 2),
      y: Math.round(options.yPct * wrapSize.h - wmBox.h / 2),
    };
  }, [wrapSize, options.xPct, options.yPct, wmBox]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const meta = pageMetaRef.current;
    if (!canvas || !meta) return;
    const raf = requestAnimationFrame(() => {
      drawWatermark(canvas.getContext('2d'), {
        width: meta.width,
        height: meta.height,
        ...options,
        opacity: options.opacity / 100,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [options, pageMeta]);

  const handlePageRender = (page) => {
    const viewport = page.getViewport({ scale: 1 });
    const meta = { width: viewport.width, height: viewport.height };
    pageMetaRef.current = meta;
    setPageMeta(meta);
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.ceil(meta.width * dpr);
      canvas.height = Math.ceil(meta.height * dpr);
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  };

  const handleDragStop = (_, data) => {
    setIsDragging(false);
    if (!wrapSize.w || !wrapSize.h) return;
    const clamp = (v) => Math.min(1, Math.max(0, v));
    onPositionChange({
      xPct: clamp((data.x + wmBox.w / 2) / wrapSize.w),
      yPct: clamp((data.y + wmBox.h / 2) / wrapSize.h),
    });
  };

  return (
    <div ref={panelRef} className="bg-slate-100/70 border border-slate-200 rounded-2xl p-3 shadow-inner dark:bg-slate-950/60 dark:border-slate-800">
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Live preview</p>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/80 border border-slate-200 rounded-full px-2.5 py-1 dark:text-slate-400 dark:bg-slate-800/60 dark:border-slate-700">
          <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Page 1 of {pageCount ?? '…'}
        </span>
      </div>
      <div className="overflow-auto max-h-[70vh] rounded-xl">
        <div ref={wrapperRef} className="relative mx-auto w-fit">
          <Document
            file={file}
            onLoadSuccess={({ numPages }) => setPageCount(numPages)}
            onLoadError={() => toastError('Failed to render document preview.')}
            loading={
              <div className="w-[640px] aspect-[1/1.414] rounded-xl animate-pulse bg-slate-200 border border-slate-200 dark:bg-slate-900 dark:border-slate-800" />
            }
            error={
              <div className="w-[640px] aspect-[1/1.414] rounded-xl bg-slate-200 border border-slate-200 flex items-center justify-center p-8 text-center text-sm text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400">
                Could not render this PDF. It may be corrupted or password-protected.
              </div>
            }
          >
            <Page
              pageNumber={1}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onRenderSuccess={handlePageRender}
              className="rounded-xl shadow-2xl"
              loading={
                <div className="w-[640px] aspect-[1/1.414] rounded-xl animate-pulse bg-slate-200 border border-slate-200 dark:bg-slate-900 dark:border-slate-800" />
              }
            />
          </Document>
          <canvas
            ref={canvasRef}
            data-testid="watermark-overlay"
            className="absolute inset-0 w-full h-full pointer-events-none rounded-xl"
            style={{ width: '100%', height: '100%' }}
          />
          {posPx && (
            <Rnd
              bounds="parent"
              position={posPx}
              size={{ width: wmBox.w, height: wmBox.h }}
              enableResizing={false}
              onDragStart={() => setIsDragging(true)}
              onDragStop={handleDragStop}
              style={{ zIndex: 10, touchAction: 'none' }}
              className={isDragging ? 'cursor-grabbing' : 'cursor-move'}
            >
              <div className="absolute inset-0 border-2 border-dashed border-purple-500/70 rounded pointer-events-none" />
            </Rnd>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-600 mt-2.5 px-1 dark:text-slate-400">
        Drag the dashed box to reposition the watermark. Every page receives the same placement.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint and build**

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/WatermarkPreview.jsx
git commit -m "feat: live watermark preview overlay component"
```

---

### Task 3: Watermark page rework (two-column workspace + options state)

**Files:**
- Modify: `src/pages/Watermark.jsx` (full rework)

**Interfaces:**
- Consumes: `WatermarkPreview` from `../components/WatermarkPreview`, `watermarkPdf` from `../services/pdfEngine`, `callWorker` from `../services/workerClient` (all unchanged).
- Produces: the page. Default options state `{ text: 'CONFIDENTIAL', fontSizePct: 8, opacity: 25, color: '#000000', rotation: -45, xPct: 0.5, yPct: 0.5 }`. Apply button passes `{ text, fontSizePct, opacity: opacity/100, color, rotation, xPct, yPct }` to the worker.

- [ ] **Step 1: Rework state and handlers**

In `src/pages/Watermark.jsx`:

Replace the six separate states (lines 15–19) with a single options object:

```js
const [options, setOptions] = useState({
  text: 'CONFIDENTIAL',
  fontSizePct: 8,
  opacity: 25,
  color: '#000000',
  rotation: -45,
  xPct: 0.5,
  yPct: 0.5,
});
```

Add the position handler and reset handler after the `onDrop` definition:

```js
const handlePositionChange = ({ xPct, yPct }) => {
  setOptions((prev) => ({ ...prev, xPct, yPct }));
};

const handleReset = () => {
  setOptions((prev) => ({
    ...prev,
    fontSizePct: 8,
    opacity: 25,
    color: '#000000',
    rotation: -45,
    xPct: 0.5,
    yPct: 0.5,
  }));
};
```

In `handleFileChange`, after `setFile(pdfFile)`, add a position reset so a new document always starts centered:

```js
setOptions((prev) => ({ ...prev, xPct: 0.5, yPct: 0.5 }));
```

- [ ] **Step 2: Rewrite `handleApply` to export the live state**

Replace the body of `handleApply` (lines 55–89) with:

```js
const handleApply = async () => {
  if (!file) return;
  const trimmed = options.text.trim();
  if (!trimmed) {
    setErrorMsg('Enter the watermark text first.');
    return;
  }
  setIsProcessing(true);
  setErrorMsg('');
  try {
    const bytes = await file.arrayBuffer();
    const exportOptions = {
      text: trimmed,
      fontSizePct: Number(options.fontSizePct),
      opacity: Number(options.opacity) / 100,
      color: options.color,
      rotation: Number(options.rotation),
      xPct: Number(options.xPct),
      yPct: Number(options.yPct),
    };
    let outBytes;
    try {
      outBytes = await callWorker('watermark', { data: bytes, options: exportOptions }, [bytes]);
    } catch {
      outBytes = await watermarkPdf(await file.arrayBuffer(), exportOptions);
    }
    setResultBytes(outBytes);
    setResultName(`watermarked-${file.name}`);
    setStep('done');
    paywall.afterSuccess();
  } catch (error) {
    console.error('Watermark failed:', error);
    setErrorMsg('Failed to apply watermark. Please try again.');
  } finally {
    setIsProcessing(false);
  }
};
```

- [ ] **Step 3: Replace the layout**

Change the outer card `max-w-xl` to `max-w-5xl` (line 117).

After the file-selected file chip block, replace the entire controls card (current lines 165–249, the `bg-slate-100/60 ... rounded-xl p-4` block containing the text input, sliders, color, diagonal toggle, and the fake preview box) with a two-column grid — controls left, `WatermarkPreview` right:

```jsx
<div className="grid lg:grid-cols-2 gap-6">
  <div className="flex flex-col gap-4">
    <label className="block">
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Watermark text</span>
      <input
        type="text"
        value={options.text}
        maxLength={40}
        onChange={(e) => setOptions((prev) => ({ ...prev, text: e.target.value }))}
        className="mt-1.5 w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white"
      />
    </label>

    <label className="block">
      <span className="text-xs font-semibold text-slate-600 flex justify-between dark:text-slate-400">
        <span>Opacity</span>
        <span className="tabular-nums text-purple-600 dark:text-purple-400">{options.opacity}%</span>
      </span>
      <input
        type="range"
        min={10}
        max={100}
        value={options.opacity}
        onChange={(e) => setOptions((prev) => ({ ...prev, opacity: Number(e.target.value) }))}
        className="mt-2 w-full accent-purple-500 cursor-pointer"
      />
    </label>

    <label className="block">
      <span className="text-xs font-semibold text-slate-600 flex justify-between dark:text-slate-400">
        <span>Size</span>
        <span className="tabular-nums text-purple-600 dark:text-purple-400">{options.fontSizePct}% of width</span>
      </span>
      <input
        type="range"
        min={3}
        max={14}
        step={0.5}
        value={options.fontSizePct}
        onChange={(e) => setOptions((prev) => ({ ...prev, fontSizePct: Number(e.target.value) }))}
        className="mt-2 w-full accent-purple-500 cursor-pointer"
      />
    </label>

    <label className="block">
      <span className="text-xs font-semibold text-slate-600 flex justify-between dark:text-slate-400">
        <span>Rotation</span>
        <span className="tabular-nums text-purple-600 dark:text-purple-400">{options.rotation}°</span>
      </span>
      <input
        type="range"
        min={-90}
        max={90}
        step={1}
        value={options.rotation}
        onChange={(e) => setOptions((prev) => ({ ...prev, rotation: Number(e.target.value) }))}
        className="mt-2 w-full accent-purple-500 cursor-pointer"
      />
    </label>

    <div className="flex flex-wrap items-center gap-4">
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer dark:text-slate-400">
        <span>Color</span>
        <span className="relative inline-flex w-8 h-8 rounded-lg border border-slate-300 overflow-hidden dark:border-slate-700">
          <input
            type="color"
            value={options.color}
            onChange={(e) => setOptions((prev) => ({ ...prev, color: e.target.value }))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Watermark color"
          />
          <span className="w-full h-full" style={{ backgroundColor: options.color }} />
        </span>
      </label>
      <button
        type="button"
        onClick={handleReset}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:border-slate-400 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500"
      >
        <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Reset
      </button>
    </div>
  </div>

  <WatermarkPreview file={file} options={options} onPositionChange={handlePositionChange} />
</div>
```

Remove the `diagonal` state (line 19) and the diagonal toggle button — they no longer exist. The Apply button stays below the grid, unchanged (lines 251–267), and the upload/done sections stay unchanged. The `RotateCcw` icon is already imported (used by the done step and now the Reset button).

- [ ] **Step 4: Verify lint and build**

Run: `npm run lint`
Expected: no errors (note: `setDiagonal` removal must not leave unused imports — `Stamp`, `UploadCloud`, `Download`, `Loader2`, `AlertCircle`, `CloudUpload`, `CheckCircle2`, `ArrowRight`, `RotateCcw` are all still used).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual smoke check**

Run: `npm run dev` and open `http://localhost:5173/watermark`

Expected:
- Upload a PDF → two-column workspace appears with page 1 rendered on the right.
- The dashed watermark box is centered; the watermark text is visible on the page at −45°, 25% black.
- Moving opacity/size/rotation/color sliders updates the on-page watermark within one frame; typing text updates instantly.
- Dragging the dashed box moves the watermark; the box re-centers on release.
- "Reset" returns size/opacity/color/rotation/position to defaults (text preserved).
- Apply → download → the downloaded PDF shows one watermark per page at the same position/rotation/opacity.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Watermark.jsx
git commit -m "feat: two-column live watermark workspace with rotation slider"
```

---

### Task 4: e2e update + full verification

**Files:**
- Modify: `e2e/smoke.tools.spec.js:142-147` (watermark block)

**Interfaces:**
- Consumes: the `data-testid="watermark-overlay"` canvas rendered by `WatermarkPreview` (Task 2).

- [ ] **Step 1: Update the watermark assertions**

In `e2e/smoke.tools.spec.js`, replace the watermark block (current lines 142–147):

```js
  await page.goto('/watermark');
  await page.locator('input[accept="application/pdf"]').setInputFiles(sizesPath);
  await page.locator('input[type="text"]').fill('TOP SECRET');
  await expect(page.getByText('TOP SECRET', { exact: true }).first()).toBeVisible();
  const wmDownload = page.waitForEvent('download');
```

with:

```js
  await page.goto('/watermark');
  await page.locator('input[accept="application/pdf"]').setInputFiles(sizesPath);
  await page.locator('input[type="text"]').fill('TOP SECRET');
  await expect(page.locator('input[type="text"]')).toHaveValue('TOP SECRET');
  await expect(page.locator('[data-testid="watermark-overlay"]')).toBeVisible();
  const wmDownload = page.waitForEvent('download');
```

The rest of the watermark block (apply → "Your watermark was applied successfully." → download → 3 pages → image paints on every page) stays unchanged — the export is still an embedded image per page.

- [ ] **Step 2: Run the full e2e suite**

Run: `npm run test:e2e`
Expected: all specs pass, including the updated watermark block (the overlay canvas becomes visible after the page preview renders; `toBeVisible` auto-waits up to its default 5s timeout — page 1 rendering is fast for the small test PDF).

- [ ] **Step 3: Commit**

```bash
git add e2e/smoke.tools.spec.js
git commit -m "test: update watermark e2e assertions for canvas preview"
```

---

## Self-Review Notes

- **Spec coverage:** Shared draw fn (spec §"Shared draw function") → Task 1. Engine + worker rewrite, `diagonal` removal, option coercion (spec §"Export") → Task 1. Canvas overlay + rAF draw loop + drag + ResizeObserver + badge (spec §"Preview") → Task 2. State, two-column layout, rotation/reset, export sync via `handleApply` (spec §"State", §"Page flow", §"Error handling") → Task 3. e2e update (spec §"Verification") → Task 4.
- **Type consistency:** `drawWatermark(ctx, { width, height, text, fontSizePct, opacity, color, rotation, xPct, yPct })` — same options shape in Task 1 (engine + worker) and Task 3 (export object built from the same `options` state). `opacity` is always 0–1 at the draw boundary: converted in Task 2's draw effect (`options.opacity / 100`) and in Task 3's `exportOptions`. `onPositionChange({ xPct, yPct })` defined in Task 2, consumed in Task 3. `data-testid="watermark-overlay"` defined in Task 2, asserted in Task 4.
- **No placeholders:** every step carries exact code or an exact existing-line reference.
