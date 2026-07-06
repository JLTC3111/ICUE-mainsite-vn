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

if (!fs.existsSync(dist)) {
  console.error('[postbuild] dist/ not found. Run vite build first.');
  process.exit(1);
}

copyFile(path.join(root, 'styles.css'), path.join(dist, 'styles.css'));
copyFile(path.join(root, 'src/script.js'), path.join(dist, 'src/script.js'));
copyDir(path.join(root, 'src/pages'), path.join(dist, 'src/pages'));
copyFile(path.join(root, '_redirects'), path.join(dist, '_redirects'));
copyDir(path.join(root, 'newsroom'), path.join(dist, 'newsroom'));
copyDir(path.join(root, 'people'), path.join(dist, 'people'));
copyDir(path.join(root, 'public'), path.join(dist, 'public'));

console.log('[postbuild] Copied static assets into dist/');
