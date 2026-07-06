import { createRoot } from 'react-dom/client';
import HomeLayoutGuard from '@icue/home-layout/HomeLayoutGuard';

const rootEl = document.getElementById('home-layout-guard-root');
if (rootEl) {
  createRoot(rootEl).render(<HomeLayoutGuard />);
}
