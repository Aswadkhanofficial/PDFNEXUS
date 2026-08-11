# Live Watermark Preview — Design

Date: 2026-08-11
Status: Approved
Scope: Watermark tool (`src/pages/Watermark.jsx`) + watermark engine (`pdfEngine.js`, `pdfWorker.js`)

## Problem

The Watermark tool offers no real PDF preview — a fake white box shows the watermark text, and users must apply/download to see the result on an actual page. The final engine draws a fixed −45° diagonal watermark tiled 3× per row; there is no rotation slider and no way to position the watermark.

## Goal

A live, real-time watermark preview rendered over the actual first page of the uploaded PDF. Slider/input changes must update the preview in <50ms. The exported PDF must contain exactly what the preview shows (text, color, opacity, position, rotation), applied to every page.

## Decisions (approved)

1. **Approach: canvas overlay.** A transparent `<canvas>` sits over the react-pdf page preview. The PDF page canvas is never touched. A shared pure draw function (`drawWatermark`) is used by the preview, the web worker, and the main-thread fallback engine, making preview and export pixel-identical.
2. **Export semantics: single draggable watermark (WYSIWYG).** The old tiled −45° pattern is removed. The final PDF contains one watermark instance at the position/rotation set on the preview, on every page.
3. **Layout: two-column workspace.** Controls on the left, live preview on the right. Card widens from `max-w-xl` to `max-w-5xl`.
4. **Position is stored as percentages** (`xPct`/`yPct` of page width/height) — zoom-independent, maps exactly to PDF points at export with no px→points conversion at export time.
5. **Rotation slider** replaces the diagonal toggle: −90°..90°, step 1, default −45° (preserves the current diagonal default look).

## State

Single options object in `Watermark.jsx`; every control updates one field:

```js
const [options, setOptions] = useState({
  text: 'CONFIDENTIAL', fontSizePct: 8, opacity: 25,
  color: '#000000', rotation: -45, xPct: 0.5, yPct: 0.5,
});
```

Slider ranges kept from the current UI: opacity 10–100%, font size 3–14% of width (step 0.5). Text max length 40.

## Files

| File | Change |
|---|---|
| `src/pages/Watermark.jsx` | Rework: two-column workspace, options state, reset button, apply passes live state |
| `src/components/WatermarkPreview.jsx` | New: Document/Page + canvas overlay + drag controller + rAF draw loop |
| `src/utils/watermarkDraw.js` | New: shared pure 2D draw function (main thread + worker + preview) |
| `src/services/pdfEngine.js` | `watermarkPdf` rewritten to use shared fn + new options |
| `src/workers/pdfWorker.js` | `watermark` op rewritten to use shared fn + new options |
| `e2e/smoke.tools.spec.js` | Replace DOM-text watermark assertion with canvas presence + input value |

## Shared draw function — `src/utils/watermarkDraw.js`

Zero imports; works with both `CanvasRenderingContext2D` and `OffscreenCanvasRenderingContext2D`:

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

## Preview — `src/components/WatermarkPreview.jsx`

- react-pdf `<Document file>` → `<Page pageNumber={1} width={640} renderTextLayer={false} renderAnnotationLayer={false}>` (same as Sign.jsx, incl. loading/error placeholders).
- `onRenderSuccess(page)` reads the pdf.js page's point dimensions. Canvas backing store is sized **once**: `canvas.width = pageW * dpr; canvas.height = pageH * dpr; ctx.scale(dpr, dpr)`. Logical drawing space = PDF points. Canvas is `absolute inset-0 w-full h-full pointer-events-none` over the page; never resized on redraw.
- **Draw loop:** `useEffect` on `options` schedules one `requestAnimationFrame` draw (cancel/reschedule on rapid changes). One `fillText` per frame — microseconds. Slider storms coalesce to ≤1 draw/frame → <50ms guaranteed.
- **Drag:** invisible `Rnd` (react-rnd, existing dep, same pattern as Sign.jsx) sized to the watermark bounding box (`measureText` width × font size), positioned at `xPct/yPct`. `onDragStop` converts px delta to percent via wrapper rect and calls `setOptions`; react-rnd moves the div natively during drag (no state churn). Faint dashed selection ring + grab cursor on the controller.
- **Resize tracking:** `ResizeObserver` on the wrapper keeps wrapper-width state fresh so px→% math stays correct across zoom/resize.
- Badge "Page 1 of N" (page count from react-pdf `Document` `onLoadSuccess` → `pdf.numPages`).

## Export — engine & worker

`watermark` op (worker) and `watermarkPdf` (main-thread fallback) both:

1. Load the PDF; for each page get `{ width, height }` in points.
2. `OffscreenCanvas(width, height)` (worker) / `document.createElement('canvas')` (fallback), sized `Math.ceil(width) × Math.ceil(height)`.
3. `drawWatermark(ctx, { width, height, ...options })` — same call the preview makes.
4. `convertToBlob('image/png')` → `pdf.embedPng` → `page.drawImage(embedded, { x: 0, y: 0, width, height })`. Page-size cache retained.

The old diagonal tile logic (3× repeat, fixed −45°) is removed. The `diagonal` option is removed; its only caller is the rewritten page. Export sync is structural: `handleApply` passes the live `options` state object verbatim to `callWorker('watermark', { data: bytes, options }, [bytes])`; the fallback passes the same object to `watermarkPdf`. Worker coerces `xPct/yPct` to [0,1] and no-ops on empty text.

## Page flow

1. Upload (unchanged drag & drop + file input, PDF validation).
2. Two-column workspace: controls left (text, opacity, size, color, rotation, reset), preview right ("Page 1 of N" badge).
3. Apply → worker (fallback main thread) → done step (download + save to cloud, unchanged). Paywall gate and `afterSuccess` unchanged.

## Error handling

- Preview render failure: react-pdf `error`/`onLoadError` placeholder + toast (Sign.jsx pattern).
- Apply failure: worker → main-thread fallback → `errorMsg` banner (existing flow).
- Empty text on Apply: inline validation message (existing behavior).

## Verification

- `npm run lint` and `npm run build` pass.
- `npm run test:e2e` — `smoke.tools.spec.js` watermark block updated: assert canvas overlay present + text input value instead of `getByText('TOP SECRET')`; the existing per-page image-paint assertion remains valid (export is still an embedded image per page).
- Manual: slider drag keeps preview responsive (single rAF fillText per frame, zero canvas resizes per tick); exported file reopened in the preview shows the watermark at the same position/rotation.
