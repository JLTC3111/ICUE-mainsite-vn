// vite.config.js
import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { marketApiPlugin } from './news-app/vite-market-api-plugin.js'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.glb': 'model/gltf-binary',
};

// In dev, Vite's SPA fallback serves the main index.html for any extensionless
// route — which hijacks the React news app built into /newsroom. This plugin
// serves the prebuilt newsroom app for /newsroom/* requests.
//
// IMPORTANT: Run `npm run build:newsroom` after news-app changes when using the
// root `npm run dev`. For live HMR while editing the newsroom, use
// `npm run dev:newsroom` (http://localhost:5173/newsroom/) instead.
function spaDevFallback({ name, basePath, outDirName }) {
  const root = process.cwd();
  const appDir = path.resolve(root, outDirName);
  return {
    name,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = (req.url || '').split('?')[0]
        if (urlPath.startsWith('/newsroom/api/')) {
          return next()
        }
        if (urlPath !== basePath && !urlPath.startsWith(`${basePath}/`)) {
          return next();
        }
        const rel = urlPath.replace(new RegExp(`^${basePath.replace('/', '\\/')}\\/?`), '');
        const filePath = path.join(appDir, rel);
        const hasExtension = Boolean(rel && path.extname(rel));

        if (hasExtension) {
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.statusCode = 200;
            res.setHeader('Content-Type', MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream');
            res.end(fs.readFileSync(filePath));
            return;
          }
          // Never SPA-fallback missing static assets — returning HTML breaks module scripts.
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(`Asset not found: ${urlPath}. Rebuild with npm run build:newsroom.`);
          return;
        }

        const indexPath = path.join(appDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(fs.readFileSync(indexPath, 'utf-8'));
          return;
        }
        next();
      });
    },
  };
}

function homeDevFallback() {
  const root = process.cwd();
  const appDir = path.resolve(root, 'dist-home');
  const siblingPrefixes = ['/newsroom', '/people', '/structure'];
  const viteInternals = ['/@vite', '/@fs', '/@id', '/@react-refresh'];

  const legacyShellSrcPages = new Set([
    '/src/pages/News.html',
    '/src/pages/notableAwards.html',
    '/src/pages/communityActivities.html',
    '/src/pages/FAQs.html',
    '/src/pages/donations.html',
    '/src/pages/privacy.html',
    '/src/pages/terms.html',
    '/src/pages/gdpr.html',
    '/src/pages/cookies.html',
  ]);

  const legacyPageRedirects = {
    '/legacy/pages/News.html': '/src/pages/News.html',
    '/legacy/pages/notableAwards.html': '/notable-awards',
    '/legacy/pages/communityActivities.html': '/community-activities',
    '/legacy/pages/FAQs.html': '/faqs',
    '/legacy/pages/donations.html': '/donations',
    '/legacy/pages/privacy.html': '/privacy',
    '/legacy/pages/terms.html': '/terms',
    '/legacy/pages/gdpr.html': '/gdpr',
    '/legacy/pages/cookies.html': '/cookies',
  };

  const staticSrcRedirects = {
    '/src/pages/notableAwards.html': '/notable-awards',
    '/src/pages/communityActivities.html': '/community-activities',
    '/src/pages/FAQs.html': '/faqs',
    '/src/pages/donations.html': '/donations',
    '/src/pages/privacy.html': '/privacy',
    '/src/pages/terms.html': '/terms',
    '/src/pages/gdpr.html': '/gdpr',
    '/src/pages/cookies.html': '/cookies',
  };

  return {
    name: 'home-dev-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = (req.url || '').split('?')[0];

        if (urlPath.startsWith('/newsroom/api/')) return next();
        if (siblingPrefixes.some((prefix) => urlPath === prefix || urlPath.startsWith(`${prefix}/`))) {
          return next();
        }
        if (viteInternals.some((prefix) => urlPath.startsWith(prefix))) return next();

        const rel = urlPath.replace(/^\//, '');
        const filePath = path.join(appDir, rel);
        const hasExtension = Boolean(rel && path.extname(rel));

        // Serve React shell for migrated static pages (nav + footer).
        if (legacyShellSrcPages.has(urlPath)) {
          const indexPath = path.join(appDir, 'index.html');
          if (fs.existsSync(indexPath)) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(fs.readFileSync(indexPath, 'utf-8'));
            return;
          }
        }

        if (staticSrcRedirects[urlPath]) {
          res.statusCode = 302;
          res.setHeader('Location', staticSrcRedirects[urlPath]);
          res.end();
          return;
        }

        // Direct browser visits to legacy embed files lack nav/footer — redirect to shell.
        // LegacyHtmlPage fetches these URLs to embed body HTML; serve the file instead.
        if (legacyPageRedirects[urlPath]) {
          const wantsEmbed =
            req.headers['x-icue-legacy-embed'] === '1' ||
            req.headers['sec-fetch-dest'] === 'empty' ||
            req.headers['sec-fetch-mode'] === 'cors';

          if (!wantsEmbed) {
            res.statusCode = 302;
            res.setHeader('Location', legacyPageRedirects[urlPath]);
            res.end();
            return;
          }

          const legacyPath = path.join(appDir, urlPath.slice(1));
          if (fs.existsSync(legacyPath)) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(fs.readFileSync(legacyPath, 'utf-8'));
            return;
          }
        }

        if (hasExtension) {
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.statusCode = 200;
            res.setHeader('Content-Type', MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream');
            res.end(fs.readFileSync(filePath));
            return;
          }

          // Netlify serves /public/* from repo root; map to dist-home copies when present.
          if (urlPath.startsWith('/public/')) {
            const publicPath = path.join(appDir, rel.replace(/^public\//, ''));
            if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
              res.statusCode = 200;
              res.setHeader('Content-Type', MIME[path.extname(publicPath).toLowerCase()] || 'application/octet-stream');
              res.end(fs.readFileSync(publicPath));
              return;
            }
          }

          return next();
        }

        const indexPath = path.join(appDir, 'index.html');
        if (!fs.existsSync(indexPath)) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Home app not built. Run npm run build:home first (or npm run dev, which builds it automatically).');
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(fs.readFileSync(indexPath, 'utf-8'));
      });
    },
  };
}

export default {
  base: '', // Use '' or './' to keep all paths relative after build
  plugins: [
    react(),
    marketApiPlugin(),
    spaDevFallback({ name: 'newsroom-dev-fallback', basePath: '/newsroom', outDirName: 'newsroom' }),
    spaDevFallback({ name: 'people-dev-fallback', basePath: '/people', outDirName: 'people' }),
    spaDevFallback({ name: 'structure-dev-fallback', basePath: '/structure', outDirName: 'structure' }),
    homeDevFallback(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '@icue/main-site-nav': path.resolve(__dirname, 'shared/main-site-nav'),
      '@icue/drawer-menu': path.resolve(__dirname, 'shared/drawer-menu'),
      '@icue/home-layout': path.resolve(__dirname, 'shared/home-layout'),
      '@icue/ui': path.resolve(__dirname, 'shared/ui'),
    },
  },
};
