import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const homeDist = path.join(root, 'dist-home');

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else copyFile(from, to);
  }
}

if (!fs.existsSync(homeDist)) {
  console.error('[sync-home-dev] dist-home/ not found. Run npm run build:home first.');
  process.exit(1);
}

copyFile(path.join(homeDist, 'index.html'), path.join(root, 'index.html'));
copyDir(path.join(homeDist, 'assets'), path.join(root, 'assets'));

for (const dir of ['aboutUs', 'bgVideos', 'flags', 'legacy', 'legal', 'logoIcons', 'models', 'news', 'pastProjects', 'recruitment', 'route-shells', 'work']) {
  copyDir(path.join(homeDist, dir), path.join(root, dir));
}

copyFile(path.join(homeDist, '_redirects'), path.join(root, '_redirects'));
copyFile(path.join(homeDist, 'sitemap.xml'), path.join(root, 'sitemap.xml'));
copyFile(path.join(homeDist, 'robots.txt'), path.join(root, 'robots.txt'));

console.log('[sync-home-dev] Synced dist-home assets to repo root for local dev.');
