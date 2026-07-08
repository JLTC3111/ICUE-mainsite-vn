import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[postbuild] Skipping missing path: ${src}`);
    return;
  }

  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function removeDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

if (!fs.existsSync(dist)) {
  console.error('[postbuild] dist/ not found. Run vite build first.');
  process.exit(1);
}

// Populate dist/ with assets the SPA still expects at runtime.
copyFile(path.join(root, 'styles.css'), path.join(dist, 'styles.css'));
copyFile(path.join(root, 'src/script.js'), path.join(dist, 'src/script.js'));
copyDir(path.join(root, 'src/pages'), path.join(dist, 'src/pages'));
copyFile(path.join(root, '_redirects'), path.join(dist, '_redirects'));
copyDir(path.join(root, 'newsroom'), path.join(dist, 'newsroom'));
copyDir(path.join(root, 'people'), path.join(dist, 'people'));
copyDir(path.join(root, 'structure'), path.join(dist, 'structure'));
copyDir(path.join(root, 'public'), path.join(dist, 'public'));

const builtIndex = path.join(dist, 'index.html');
if (!fs.existsSync(builtIndex)) {
  console.error('[postbuild] dist/index.html not found.');
  process.exit(1);
}

// Netlify currently publishes the repo root (not dist/), so mirror the build
// output to the paths production actually serves.
copyFile(builtIndex, path.join(root, 'index.html'));
removeDir(path.join(root, 'assets'));
copyDir(path.join(dist, 'assets'), path.join(root, 'assets'));
copyFile(path.join(dist, 'zalo-link.js'), path.join(root, 'zalo-link.js'));
if (fs.existsSync(path.join(dist, 'flags'))) {
  removeDir(path.join(root, 'flags'));
  copyDir(path.join(dist, 'flags'), path.join(root, 'flags'));
}

console.log('[postbuild] Synced production build to repo root for Netlify deploy.');
