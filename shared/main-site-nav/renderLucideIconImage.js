import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

export function renderLucideIconImage(Icon, size = 512, strokeWidth = 2.25) {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;';
    document.body.appendChild(container);

    const root = createRoot(container);

    const cleanup = () => {
      root.unmount();
      container.remove();
    };

    const rasterize = () => {
      const svg = container.querySelector('svg');
      if (!svg) {
        cleanup();
        resolve(null);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        resolve(null);
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      img.onload = () => {
        const padding = size * 0.14;
        const drawSize = size - padding * 2;
        ctx.drawImage(img, padding, padding, drawSize, drawSize);
        cleanup();
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        cleanup();
        resolve(null);
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
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
        cleanup();
        resolve(null);
        return;
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(rasterize);
      });
    };

    waitForSvg();
  });
}
