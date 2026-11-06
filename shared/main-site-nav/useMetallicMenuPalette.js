import { useLayoutEffect, useRef, useState } from 'react';

const SHARED_PAINT_PROPS = {
  seed: 200,
  scale: 5,
  blur: 0.1,
  mouseAnimation: false,
  angle: 180,
};

const PALETTES = {
  dark: {
    ...SHARED_PAINT_PROPS,
    lightColor: '#ffffff',
    darkColor: '#80ecff',
    tintColor: '#80ecff',
    brightness: 1.35,
    contrast: 0.5,
  },
  light: {
    ...SHARED_PAINT_PROPS,
    lightColor: '#548caf',
    darkColor: '#132f4b',
    tintColor: '#bddcee',
    brightness: 1.05,
    contrast: 1.25,
  },
};

// CSS owns the capsule surface. Read its marker instead of duplicating the
// theme/video/hero rules here; non-pill headers retain the original palette.
export default function useMetallicMenuPalette() {
  const surfaceRef = useRef(null);
  const [surface, setSurface] = useState('dark');

  useLayoutEffect(() => {
    const element = surfaceRef.current;
    if (!element) return undefined;
    const update = () => {
      const value = window.getComputedStyle(element).getPropertyValue('--metallic-menu-surface').trim();
      setSurface(value === 'light' ? 'light' : 'dark');
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-icue-home-theme', 'data-home-bg-video'],
    });
    const header = element.closest('.pill-site-header');
    if (header) observer.observe(header, {
      attributes: true,
      attributeFilter: ['data-over-hero', 'class'],
    });
    return () => observer.disconnect();
  }, []);

  return { surfaceRef, surface, paintProps: PALETTES[surface] };
}
