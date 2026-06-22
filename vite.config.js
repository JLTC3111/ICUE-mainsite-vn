// vite.config.js
import fs from 'node:fs'
import path from 'node:path'
import { marketApiPlugin } from './news-app/vite-market-api-plugin.js'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
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
function newsroomDevFallback() {
  const root = process.cwd();
  const newsroomDir = path.resolve(root, 'newsroom');
  return {
    name: 'newsroom-dev-fallback',
    configureServer(server) {
      // Register first so /newsroom wins over any stale public/ copies.
      server.middlewares.use((req, res, next) => {
        const urlPath = (req.url || '').split('?')[0]
        if (urlPath.startsWith('/newsroom/api/')) {
          return next()
        }
        if (urlPath !== '/newsroom' && !urlPath.startsWith('/newsroom/')) {
          return next();
        }
        const rel = urlPath.replace(/^\/newsroom\/?/, '');
        const filePath = path.join(newsroomDir, rel);
        // Serve a real asset file if it exists under /newsroom.
        if (rel && path.extname(rel) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.statusCode = 200;
          res.setHeader('Content-Type', MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream');
          res.end(fs.readFileSync(filePath));
          return;
        }
        // Otherwise fall back to the SPA shell.
        const indexPath = path.join(newsroomDir, 'index.html');
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
  plugins: [marketApiPlugin(), newsroomDevFallback()],
};
