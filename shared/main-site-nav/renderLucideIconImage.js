import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

const RASTER_TIMEOUT_MS = 4000;

/** Canvas-drawn X for MetallicPaint when Lucide rasterization fails. */
export function renderCloseIconFallback(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const pad = size * 0.27;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = size * 0.075;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(size - pad, size - pad);
  ctx.moveTo(size - pad, pad);
  ctx.lineTo(pad, size - pad);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

export function renderLucideIconImage(Icon, size = 512, strokeWidth = 2.25) {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;';
    document.body.appendChild(container);

    const root = createRoot(container);
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      root.unmount();
      container.remove();
      resolve(value);
    };

    const timeoutId = window.setTimeout(() => finish(null), RASTER_TIMEOUT_MS);

    const rasterize = () => {
      const svg = container.querySelector('svg');
      if (!svg) {
        finish(null);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        finish(null);
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      let objectUrl = null;

      const onImageReady = () => {
        const padding = size * 0.14;
        const drawSize = size - padding * 2;
        ctx.drawImage(img, padding, padding, drawSize, drawSize);
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        finish(canvas.toDataURL('image/png'));
      };

      const onImageError = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        finish(null);
      };

      img.onload = onImageReady;
      img.onerror = onImageError;

      try {
        objectUrl = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }));
        img.src = objectUrl;
      } catch {
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
      }
    };

    const waitForSvg = (attempt = 0) => {
      flushSync(() => {
        root.render(createElement(Icon, {
          size,
          strokeWidth,
          color: '#000000',
        }));
      });

      const svg = container.querySelector('svg');
      if (!svg) {
        if (attempt < 30) {
          requestAnimationFrame(() => waitForSvg(attempt + 1));
          return;
        }
        finish(null);
        return;
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(rasterize);
      });
    };

    waitForSvg();
  });
}
