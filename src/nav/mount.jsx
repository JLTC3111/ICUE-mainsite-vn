import '../../styles.css';
import { createRoot } from 'react-dom/client';
import MainSiteNav from '@icue/main-site-nav/MainSiteNav';

const rootEl = document.getElementById('main-site-nav-root');
if (rootEl) {
  createRoot(rootEl).render(<MainSiteNav />);
}
