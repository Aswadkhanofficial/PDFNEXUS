import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Eraser, Undo2 } from 'lucide-react';

const fmt = (n) => Math.round(n * 100) / 100;

const smoothPath = (points) => {
  if (points.length < 2) return '';
  let d = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const midX = fmt((points[i].x + points[i + 1].x) / 2);
    const midY = fmt((points[i].y + points[i + 1].y) / 2);
    d += ` Q ${fmt(points[i].x)} ${fmt(points[i].y)} ${midX} ${midY}`;
  }
  d += ` L ${fmt(points[points.length - 1].x)} ${fmt(points[points.length - 1].y)}`;
  return d;
};

const SignaturePad = forwardRef(function SignaturePad(
  { penColor = '#000000', strokeWidth = 2, minStrokeWidth = 1, maxStrokeWidth = 12, onChange },
  ref
) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const dprRef = useRef(1);
  const inkLayerRef = useRef(null);
  const historyRef = useRef([]);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef([]);
  const drawingRef = useRef(false);

  const [color, setColor] = useState(penColor);
  const [width, setWidth] = useState(strokeWidth);
  const [canUndo, setCanUndo] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  const getPointerPosition = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = typeof event.clientX === 'number' ? event.clientX : event.touches[0].clientX;
    const clientY = typeof event.clientY === 'number' ? event.clientY : event.touches[0].clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const syncInkLayer = useCallback(() => {
    const canvas = canvasRef.current;
    const inkLayer = inkLayerRef.current;
    inkLayer.width = canvas.width;
    inkLayer.height = canvas.height;
    inkLayer.getContext('2d').drawImage(canvas, 0, 0);
  }, []);

  const drawDot = (point) => {
    const ctx = ctxRef.current;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, width / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawSegment = (from, to) => {
    const ctx = ctxRef.current;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(from.x, from.y, (from.x + to.x) / 2, (from.y + to.y) / 2);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const beginStroke = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (event.pointerId != null && !canvas.hasPointerCapture(event.pointerId)) {
      canvas.setPointerCapture(event.pointerId);
    }
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    currentStrokeRef.current = [];
    drawingRef.current = true;
    const point = getPointerPosition(event);
    currentStrokeRef.current.push(point);
    drawDot(point);
    setCanUndo(true);
    setHasInk(true);
  };

  const moveStroke = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const current = getPointerPosition(event);
    const previous = currentStrokeRef.current[currentStrokeRef.current.length - 1];
    if (!previous) {
      currentStrokeRef.current.push(current);
      drawDot(current);
      return;
    }
    drawSegment(previous, current);
    currentStrokeRef.current.push(current);
  };

  const endStroke = () => {
    const stroke = currentStrokeRef.current;
    if (drawingRef.current && stroke.length > 0) {
      strokesRef.current.push({ color, width, points: stroke });
    }
    drawingRef.current = false;
    currentStrokeRef.current = [];
    syncInkLayer();
    onChange?.();
  };

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    const snapshot = historyRef.current.pop();
    if (!snapshot) return;
    drawingRef.current = false;
    const ctx = ctxRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(snapshot, 0, 0);
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    strokesRef.current.pop();
    setCanUndo(historyRef.current.length > 0);
    setHasInk(historyRef.current.length > 0);
    syncInkLayer();
  }, [syncInkLayer]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    historyRef.current = [];
    strokesRef.current = [];
    currentStrokeRef.current = [];
    drawingRef.current = false;
    setCanUndo(false);
    setHasInk(false);
    syncInkLayer();
  }, [syncInkLayer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;
    inkLayerRef.current = document.createElement('canvas');

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(window.devicePixelRatio || 1, 1);
      dprRef.current = dpr;
      const nextWidth = Math.max(1, Math.round(rect.width * dpr));
      const nextHeight = Math.max(1, Math.round(rect.height * dpr));
      if (nextWidth === canvas.width && nextHeight === canvas.height) return;
      const inkLayer = inkLayerRef.current;
      const preserved = inkLayer.width > 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (preserved) {
        ctx.drawImage(inkLayer, 0, 0, inkLayer.width, inkLayer.height, 0, 0, rect.width, rect.height);
        syncInkLayer();
        setHasInk(true);
      }
      historyRef.current = [];
      strokesRef.current = [];
      currentStrokeRef.current = [];
      drawingRef.current = false;
      setCanUndo(false);
    };

    const observer = new ResizeObserver(syncSize);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      ctxRef.current = null;
    };
  }, [syncInkLayer]);

  const getInkRect = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let top = height;
    let bottom = -1;
    let left = width;
    let right = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 3] > 0) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }
    return { left, top, right, bottom };
  };

  const getTrimmedCanvas = () => {
    const canvas = canvasRef.current;
    const rect = getInkRect();
    const trimmed = document.createElement('canvas');
    if (rect.bottom < rect.top) return trimmed;
    trimmed.width = rect.right - rect.left + 1;
    trimmed.height = rect.bottom - rect.top + 1;
    trimmed.getContext('2d').drawImage(
      canvas,
      rect.left,
      rect.top,
      trimmed.width,
      trimmed.height,
      0,
      0,
      trimmed.width,
      trimmed.height
    );
    return trimmed;
  };

  const getSignatureData = () => {
    const rect = getInkRect();
    const dpr = dprRef.current;
    const pngDataUrl = getTrimmedCanvas().toDataURL('image/png');
    if (rect.bottom < rect.top) {
      return { pngDataUrl, svgString: '', svgPath: '', width: 0, height: 0 };
    }
    const left = rect.left / dpr;
    const top = rect.top / dpr;
    const viewWidth = fmt((rect.right - rect.left + 1) / dpr);
    const viewHeight = fmt((rect.bottom - rect.top + 1) / dpr);

    const shifted = strokesRef.current.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({
        x: fmt(point.x - left),
        y: fmt(point.y - top),
      })),
    }));

    const paths = shifted.map((stroke) => {
      if (stroke.points.length === 1) {
        const point = stroke.points[0];
        return `<circle cx="${point.x}" cy="${point.y}" r="${fmt(stroke.width / 2)}" fill="${stroke.color}"/>`;
      }
      return `<path d="${smoothPath(stroke.points)}" stroke="${stroke.color}" stroke-width="${stroke.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    });

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewWidth} ${viewHeight}">${paths.join('')}</svg>`;
    const svgPath = shifted.map((stroke) => smoothPath(stroke.points)).filter(Boolean).join(' ');

    return { pngDataUrl, svgString, svgPath, width: viewWidth, height: viewHeight };
  };

  useImperativeHandle(ref, () => ({
    clear,
    undo,
    isEmpty: () => !hasInk,
    getTrimmedCanvas,
    getSignatureData,
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="relative inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer dark:text-slate-300">
          <span className="w-6 h-6 rounded-md border border-slate-300 dark:border-slate-700" style={{ backgroundColor: color }} />
          Color
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Pen color"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
          Thickness
          <input
            type="range"
            min={minStrokeWidth}
            max={maxStrokeWidth}
            step="0.5"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-28 accent-purple-500 cursor-pointer"
            aria-label="Stroke thickness"
          />
          <span className="w-9 tabular-nums text-slate-600 dark:text-slate-400">{width}px</span>
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:text-white dark:hover:border-slate-500"
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={!hasInk}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:text-red-500 hover:border-red-500/50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:text-red-400 dark:hover:border-red-500/50"
          >
            <Eraser className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-inner dark:border-slate-800">
        <canvas
          ref={canvasRef}
          className="block w-full cursor-crosshair"
          style={{ touchAction: 'none' }}
          onPointerDown={beginStroke}
          onPointerMove={moveStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onLostPointerCapture={endStroke}
        />
      </div>
    </div>
  );
});

export default SignaturePad;