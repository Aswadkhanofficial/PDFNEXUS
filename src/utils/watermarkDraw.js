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
