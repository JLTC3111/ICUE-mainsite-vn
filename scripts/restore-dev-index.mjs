import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const template = path.join(root, 'index.template.html');
const index = path.join(root, 'index.html');

if (!fs.existsSync(template)) {
  console.error('[restore-dev-index] Missing index.template.html');
  process.exit(1);
}

fs.copyFileSync(template, index);
console.log('[restore-dev-index] Restored index.html for Vite dev.');
