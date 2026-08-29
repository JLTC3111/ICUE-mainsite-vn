import { useCallback, useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { supportsMetallicMenuPaint } from './metallicPaintSupport';

const METALLIC_PROPS = {
  seed: 200,
  scale: 5,
  blur: 0.1,
  mouseAnimation: false,
  lightColor: '#ffffff',
  darkColor: '#80ecff',
  tintColor: '#80ecff',
  brightness: 1.35,
  contrast: 0.5,
  angle: 180,
};

const ICON_MASK_COVERAGE_RANGE = [0.02, 0.45];
const EMPTY_READY_STATE = { menu: false, close: false };

function createMaskDataUrl(paths, strokeWidth) {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
    '<rect width="512" height="512" fill="#fff"/>',
    `<path d="${paths}" fill="none" stroke="#000" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    '</svg>',
  ].join('');

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const MENU_MASK_SRC = createMaskDataUrl(
  'M96 160H416 M96 256H416 M96 352H416',
  52,
);
const CLOSE_MASK_SRC = createMaskDataUrl(
  'M150 150L362 362 M362 150L150 362',
  58,
);

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function MetallicMenuIcon({ isOpen = false, menuIconRef }) {
  const [paintMode, setPaintMode] = useState('checking');
  const [PaintComponent, setPaintComponent] = useState(null);
  const [readyLayers, setReadyLayers] = useState(EMPTY_READY_STATE);
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(async () => {
      if (!supportsMetallicMenuPaint()) {
        setPaintMode('fallback');
        return;
      }

      try {
        const module = await import('@icue/ui/MetallicPaint/MetallicPaint');
        if (cancelled) return;
        setPaintComponent(() => module.default);
        setPaintMode('metallic');
      } catch {
        if (!cancelled) setPaintMode('fallback');
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const markMenuReady = useCallback(() => {
    setReadyLayers((current) => current.menu ? current : { ...current, menu: true });
  }, []);

  const markCloseReady = useCallback(() => {
    setReadyLayers((current) => current.close ? current : { ...current, close: true });
  }, []);

  const useFallback = useCallback(() => {
    setReadyLayers(EMPTY_READY_STATE);
    setPaintComponent(null);
    setPaintMode('fallback');
  }, []);

  const metallicReady = paintMode === 'metallic' && readyLayers.menu && readyLayers.close;
  const speed = reducedMotion ? 0 : 0.5;

  return (
    <span
      ref={menuIconRef}
      id="menuIcon"
      className={[
        'menu-icon-metallic',
        isOpen ? 'is-open' : '',
        metallicReady ? 'is-metallic-ready' : '',
      ].filter(Boolean).join(' ')}
      data-renderer={metallicReady ? 'metallic' : 'static'}
      aria-hidden="true"
    >
      <span className="menu-icon-metallic__layer menu-icon-metallic__layer--menu">
        <Menu
          className="menu-icon-metallic__lucide menu-icon-metallic__lucide-menu"
          size="100%"
          strokeWidth={2.25}
        />
        {paintMode === 'metallic' && PaintComponent ? (
          <PaintComponent
            className="menu-icon-metallic__paint"
            imageSrc={MENU_MASK_SRC}
            speed={speed}
            paused={isOpen}
            maskCoverageRange={ICON_MASK_COVERAGE_RANGE}
            onTextureReady={markMenuReady}
            onTextureError={useFallback}
            {...METALLIC_PROPS}
          />
        ) : null}
      </span>
      <span className="menu-icon-metallic__layer menu-icon-metallic__layer--close">
        <X
          className="menu-icon-metallic__lucide menu-icon-metallic__lucide-close"
          size="100%"
          strokeWidth={2.75}
        />
        {paintMode === 'metallic' && PaintComponent ? (
          <PaintComponent
            className="menu-icon-metallic__paint"
            imageSrc={CLOSE_MASK_SRC}
            speed={speed}
            paused={!isOpen}
            maskCoverageRange={ICON_MASK_COVERAGE_RANGE}
            onTextureReady={markCloseReady}
            onTextureError={useFallback}
            {...METALLIC_PROPS}
          />
        ) : null}
      </span>
    </span>
  );
}
