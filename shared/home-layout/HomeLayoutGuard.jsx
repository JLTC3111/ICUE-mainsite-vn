import { useEffect } from 'react';
import './homeLayout.css';

const TABLET_LANDSCAPE = '(min-width: 768px) and (max-width: 1400px) and (orientation: landscape)';

function readGutter() {
  const viewport = window.innerWidth;
  const client = document.documentElement.clientWidth;
  return Math.max(0, (viewport - client) / 2);
}

function applyLayoutState() {
  const root = document.documentElement;
  const main = document.getElementById('content');
  const isTabletLandscape = window.matchMedia(TABLET_LANDSCAPE).matches;
  const isHome = !!main?.querySelector('.home-hero');
  const gutter = readGutter();

  root.classList.toggle('tablet-landscape', isTabletLandscape);
  root.style.setProperty('--viewport-inline-gutter', `${gutter}px`);

  if (main) {
    main.classList.toggle('home-layout-balanced', isTabletLandscape && isHome);
  }
}

export default function HomeLayoutGuard() {
  useEffect(() => {
    const tabletQuery = window.matchMedia(TABLET_LANDSCAPE);

    applyLayoutState();

    const onChange = () => applyLayoutState();
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    tabletQuery.addEventListener('change', onChange);

    const content = document.getElementById('content');
    const observer = content
      ? new MutationObserver(applyLayoutState)
      : null;

    if (content && observer) {
      observer.observe(content, { childList: true, subtree: false });
    }

    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('orientationchange', onChange);
      tabletQuery.removeEventListener('change', onChange);
      observer?.disconnect();

      document.documentElement.classList.remove('tablet-landscape');
      document.documentElement.style.removeProperty('--viewport-inline-gutter');
      document.getElementById('content')?.classList.remove('home-layout-balanced');
    };
  }, []);

  return null;
}
