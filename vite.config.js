// vite.config.js
import fs from 'node:fs'
import path from 'node:path'

// In dev, Vite's SPA fallback serves the main index.html for any extensionless
// route — which hijacks the React news app mounted at /newsroom/. This plugin
// intercepts /newsroom/* (non-file) requests and serves the built React
// index.html instead, so the sub-app loads correctly during local dev.
// (Production static hosts resolve /newsroom/index.html natively.)
function newsroomDevFallback() {
  return {
    name: 'newsroom-dev-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || '';
        const urlPath = rawUrl.split('?')[0];
        if (urlPath === '/newsroom' || urlPath.startsWith('/newsroom/')) {
          // Let real files (assets with an extension) pass through to Vite.
          if (!path.extname(urlPath)) {
            const indexPath = path.resolve(
              process.cwd(),
              'public/newsroom/index.html',
            );
            if (fs.existsSync(indexPath)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(fs.readFileSync(indexPath, 'utf-8'));
              return;
            }
          }
        }
        next();
      });
    },
  };
}

export default {
  base: '', // Use '' or './' to keep all paths relative after build
  plugins: [newsroomDevFallback()],
};
