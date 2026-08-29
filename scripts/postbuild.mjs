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

function copyFontKit(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[postbuild] Skipping missing font kit: ${src}`);
    return;
  }

  removeDir(dest);
  fs.mkdirSync(dest, { recursive: true });

  let copied = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.woff2')) continue;
    copyFile(path.join(src, entry.name), path.join(dest, entry.name));
    copied += 1;
  }

  if (copied === 0) {
    console.warn(`[postbuild] No WOFF2 files found in font kit: ${src}`);
  }
}

if (!fs.existsSync(homeDist)) {
  console.error('[postbuild] dist-home/ not found. Run npm run build:home first.');
  process.exit(1);
}

// Merge sibling apps into the home-app build output.
copyDir(path.join(root, 'newsroom'), path.join(homeDist, 'newsroom'));
copyDir(path.join(root, 'people'), path.join(homeDist, 'people'));
copyDir(path.join(root, 'structure'), path.join(homeDist, 'structure'));
copyDir(path.join(root, 'our-work'), path.join(homeDist, 'our-work'));
copyDir(path.join(root, 'contact'), path.join(homeDist, 'contact'));
copyDir(path.join(root, 'legal'), path.join(homeDist, 'legal'));
copyDir(path.join(root, 'faqs'), path.join(homeDist, 'faqs'));
copyDir(path.join(root, 'recruitment'), path.join(homeDist, 'recruitment'));
copyDir(path.join(root, 'community-activities'), path.join(homeDist, 'community-activities'));
copyDir(path.join(root, 'src/pages'), path.join(homeDist, 'src/pages'));
copyDir(path.join(root, 'public'), path.join(homeDist, 'public'));
copyFontKit(path.join(root, 'fonts'), path.join(homeDist, 'fonts'));
copyFile(path.join(root, '_redirects'), path.join(homeDist, '_redirects'));
copyFile(path.join(root, '_headers'), path.join(homeDist, '_headers'));

// Publish social/Netlify preview image at site root (/preview.jpg) in addition to /public/preview.jpg.
const previewJpg = path.join(root, 'public/preview.jpg');
if (fs.existsSync(previewJpg)) {
  copyFile(previewJpg, path.join(homeDist, 'preview.jpg'));
  copyFile(previewJpg, path.join(root, 'preview.jpg'));
} else {
  console.warn('[postbuild] Missing public/preview.jpg — Netlify/OG preview image will be unavailable.');
}

const builtIndex = path.join(homeDist, 'index.html');
if (!fs.existsSync(builtIndex)) {
  console.error('[postbuild] dist-home/index.html not found.');
  process.exit(1);
}

// Mirror selected home-app output to repo root (do not overwrite entire src/).
copyFile(builtIndex, path.join(root, 'index.html'));
removeDir(path.join(root, 'assets'));
copyDir(path.join(homeDist, 'assets'), path.join(root, 'assets'));

const rootDirsFromHome = [
  'aboutUs',
  'bgVideos',
  'flags',
  'legacy',
  'logoIcons',
  'models',
  'news',
  'pastProjects',
  'route-shells',
  'work',
  'newsroom',
  'people',
  'structure',
  'our-work',
  'contact',
  'legal',
  // 'recruitment' is an app output now, not the image directory it used to be:
  // the photographs live in recruitment-app/public/media/ and ship inside the
  // app's own build. See recruitment-app/vite.config.js.
  'faqs',
  'recruitment',
  'community-activities',
  'public',
];

for (const dir of rootDirsFromHome) {
  const from = path.join(homeDist, dir);
  if (!fs.existsSync(from)) continue;
  removeDir(path.join(root, dir));
  copyDir(from, path.join(root, dir));
}

copyDir(path.join(homeDist, 'src/pages'), path.join(root, 'src/pages'));
copyFile(path.join(homeDist, '_redirects'), path.join(root, '_redirects'));
copyFile(path.join(homeDist, 'sitemap.xml'), path.join(root, 'sitemap.xml'));
copyFile(path.join(homeDist, 'robots.txt'), path.join(root, 'robots.txt'));

// Ensure past-project card galleries are present in both /pastProjects and /public/pastProjects.
const cardGalleriesSrc = path.join(root, 'src/pages/public/pastProjects');
if (fs.existsSync(cardGalleriesSrc)) {
  for (const entry of fs.readdirSync(cardGalleriesSrc, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('project_')) continue;
    const from = path.join(cardGalleriesSrc, entry.name);
    copyDir(from, path.join(root, 'public/pastProjects', entry.name));
    copyDir(from, path.join(root, 'pastProjects', entry.name));
    copyDir(from, path.join(homeDist, 'pastProjects', entry.name));
    copyDir(from, path.join(homeDist, 'public/pastProjects', entry.name));
  }
}

// Past-project detail pages may still request /src/card.js; keep a public fallback.
const cardJs = path.join(root, 'src/card.js');
const publicCardJs = path.join(root, 'public/card.js');
if (fs.existsSync(cardJs)) {
  copyFile(cardJs, path.join(homeDist, 'src/card.js'));
  copyFile(cardJs, publicCardJs);
  copyFile(cardJs, path.join(homeDist, 'public/card.js'));
} else if (fs.existsSync(publicCardJs)) {
  copyFile(publicCardJs, path.join(homeDist, 'public/card.js'));
} else {
  console.warn('[postbuild] Missing card.js — past project card pages may break.');
}

// Legacy article template loads /src/article.js (restored for archive news).
const articleJs = path.join(root, 'src/article.js');
const publicArticleJs = path.join(root, 'public/article.js');
if (fs.existsSync(articleJs)) {
  copyFile(articleJs, path.join(homeDist, 'src/article.js'));
  copyFile(articleJs, publicArticleJs);
  copyFile(articleJs, path.join(homeDist, 'public/article.js'));
} else if (fs.existsSync(publicArticleJs)) {
  copyFile(publicArticleJs, path.join(homeDist, 'src/article.js'));
  copyFile(publicArticleJs, path.join(homeDist, 'public/article.js'));
  copyFile(publicArticleJs, articleJs);
} else {
  console.warn('[postbuild] Missing article.js — legacy article_template.html may break.');
}

// Static pages under /src/pages/*.html request relative styles.css → /src/pages/styles.css.
const rootStyles = path.join(root, 'styles.css');
if (fs.existsSync(rootStyles)) {
  copyFile(rootStyles, path.join(root, 'src/pages/styles.css'));
  copyFile(rootStyles, path.join(homeDist, 'src/pages/styles.css'));
  copyFile(rootStyles, path.join(homeDist, 'styles.css'));
}

// Ensure legacy news logos/photos are present at both /public/news and /news.
const newsSrc = path.join(root, 'public/news');
if (fs.existsSync(newsSrc)) {
  copyDir(newsSrc, path.join(homeDist, 'public/news'));
  copyDir(newsSrc, path.join(homeDist, 'news'));
  copyDir(newsSrc, path.join(root, 'news'));
}

// Quiet on success — the remaining console.warn calls above still surface real
// problems (missing preview.jpg, card.js, article.js) during a build.
