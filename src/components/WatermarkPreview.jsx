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
