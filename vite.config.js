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
        if (rel && path.extname(rel) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.statusCode = 200;
          res.setHeader('Content-Type', MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream');
          res.end(fs.readFileSync(filePath));
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

export default {
  base: '', // Use '' or './' to keep all paths relative after build
  plugins: [
    react(),
    marketApiPlugin(),
    spaDevFallback({ name: 'newsroom-dev-fallback', basePath: '/newsroom', outDirName: 'newsroom' }),
    spaDevFallback({ name: 'people-dev-fallback', basePath: '/people', outDirName: 'people' }),
  ],
  resolve: {
    alias: {
      '@icue/main-site-nav': path.resolve(__dirname, 'shared/main-site-nav'),
      '@icue/home-layout': path.resolve(__dirname, 'shared/home-layout'),
    },
  },
};
