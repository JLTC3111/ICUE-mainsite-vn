import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import MetallicPaint from '@icue/ui/MetallicPaint/MetallicPaint';
import { renderLucideIconImage } from './renderLucideIconImage';

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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

export default function MetallicMenuIcon({ isOpen = false, menuIconRef }) {
  const [menuImageSrc, setMenuImageSrc] = useState(null);
  const [closeImageSrc, setCloseImageSrc] = useState(null);
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      renderLucideIconImage(Menu, 512, 2.25),
      renderLucideIconImage(X, 512, 2.25),
    ]).then(([menuSrc, closeSrc]) => {
      if (cancelled) return;
      setMenuImageSrc(menuSrc);
      setCloseImageSrc(closeSrc);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const speed = reducedMotion ? 0 : 0.5;

  return (
    <span
      ref={menuIconRef}
      id="menuIcon"
      className={['menu-icon-metallic', isOpen ? 'is-open' : ''].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <span className="menu-icon-metallic__layer menu-icon-metallic__layer--menu">
        {menuImageSrc ? (
          <MetallicPaint
            className="menu-icon-metallic__paint"
            imageSrc={menuImageSrc}
            speed={speed}
            {...METALLIC_PROPS}
          />
        ) : null}
      </span>
      <span className="menu-icon-metallic__layer menu-icon-metallic__layer--close">
        {closeImageSrc ? (
          <MetallicPaint
            className="menu-icon-metallic__paint"
            imageSrc={closeImageSrc}
            speed={speed}
            {...METALLIC_PROPS}
          />
        ) : null}
      </span>
    </span>
  );
}
