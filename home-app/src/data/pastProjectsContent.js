/** Static past-project records. Copy lives in `projects.items` locale keys. */
import { PAST_PROJECT_COVERS } from './pastProjectCovers.js'

/** Listing cards. Files live in public/pastProjects/grid_card_images/. */
const GRID_CARD_DIR = '/pastProjects/grid_card_images'
const CARD_FILES = {
  '1': 'pp_1.jpg',
  '2': 'pp_2.jpg',
  '3': 'pp_3.jpg',
  '4': 'pp_4.jpg',
  '5': 'pp_5.jpg',
  '6': 'pp_6.jpg',
  '7': 'pp_7.jpg',
  '8': 'pp_8.jpg',
  '9': 'pp_9.jpg',
}
const CARD_SIZES = {
  'pp_1.jpg': [2394, 1413],
  'pp_2.jpg': [2084, 1300],
  'pp_3.jpg': [1079, 1200],
  'pp_4.jpg': [1200, 1096],
  'pp_5.jpg': [1054, 1320],
  'pp_6.jpg': [460, 647],
  'pp_7.jpg': [793, 1000],
  'pp_8.jpg': [1117, 1200],
  'pp_9.jpg': [1200, 871],
}

function project(id, key, year, images) {
  const collage = PAST_PROJECT_COVERS[id]
  const cardName = CARD_FILES[id]
  const size = CARD_SIZES[cardName]
  if (!size) throw new Error(`Missing card image ${cardName} for project ${id}`)
  const [width, height] = size
  return {
    id,
    key,
    year,
    cover: `${GRID_CARD_DIR}/${cardName}`,
    width,
    height,
    hero: collage.src,
    heroWidth: collage.width,
    heroHeight: collage.height,
    images,
  }
}

export const PAST_PROJECTS = [
  project('1', 'laoCai', '2024', [
      { src: '/pastProjects/project_1/pp_1a.jpg', width: 2047, height: 1448 },
      { src: '/pastProjects/project_1/pp_1b.jpg', width: 1015, height: 657 },
      { src: '/pastProjects/project_1/pp_1c.jpg', width: 1024, height: 1450 },
      { src: '/pastProjects/project_1/pp_1d.jpg', width: 1024, height: 631 },
      { src: '/pastProjects/project_1/pp_1e.jpg', width: 1024, height: 1048 },
    ]),
  project('2', 'hopThanh', '2025', [
      { src: '/pastProjects/project_2/pp_2a.jpg', width: 1904, height: 1070 },
      { src: '/pastProjects/project_2/pp_2b.jpg', width: 900, height: 716 },
      { src: '/pastProjects/project_2/pp_2c.jpg', width: 700, height: 466 },
      { src: '/pastProjects/project_2/pp_2d.jpg', width: 1836, height: 1224 },
      { src: '/pastProjects/project_2/pp_2e.jpg', width: 2382, height: 1256 },
    ]),
  project('3', 'subdivision6b', '2025', [
      { src: '/pastProjects/project_3/pp_3a.jpg', width: 1125, height: 819 },
      { src: '/pastProjects/project_3/pp_3b.jpg', width: 1412, height: 1842 },
      { src: '/pastProjects/project_3/pp_3c.jpg', width: 1920, height: 980 },
      { src: '/pastProjects/project_3/pp_3d.jpg', width: 960, height: 720 },
    ]),
  project('4', 'cocSan', '2025', [
      { src: '/pastProjects/project_4/pp_4a.webp', width: 460, height: 312 },
      { src: '/pastProjects/project_4/pp_4b.webp', width: 474, height: 316 },
      { src: '/pastProjects/project_4/pp_4c.webp', width: 1200, height: 630 },
      { src: '/pastProjects/project_4/pp_4d.webp', width: 960, height: 720 },
    ]),
  project('5', 'dongYen', '2024', [
      { src: '/pastProjects/project_5/pp_5a.jpg', width: 1500, height: 1033 },
      { src: '/pastProjects/project_5/pp_5b.jpg', width: 768, height: 1007 },
      { src: '/pastProjects/project_5/pp_5c.jpg', width: 800, height: 568 },
      { src: '/pastProjects/project_5/pp_5d.jpg', width: 3300, height: 2550 },
      { src: '/pastProjects/project_5/pp_5e.jpg', width: 1676, height: 1212 },
    ]),
  project('6', 'naChi', '2024', [
      { src: '/pastProjects/project_6/pp_6a.jpg', width: 1462, height: 664 },
      { src: '/pastProjects/project_6/pp_6b.jpg', width: 1200, height: 857 },
      { src: '/pastProjects/project_6/pp_6c.jpg', width: 793, height: 1000 },
      { src: '/pastProjects/project_6/pp_6d.jpg', width: 650, height: 524 },
      { src: '/pastProjects/project_6/pp_6e.jpg', width: 659, height: 874 },
      { src: '/pastProjects/project_6/pp_6f.jpg', width: 500, height: 378 },
    ]),
  project('7', 'tanBac', '2024', [
      { src: '/pastProjects/project_7/pp_7a.jpg', width: 1020, height: 1072 },
      { src: '/pastProjects/project_7/pp_7b.jpg', width: 1076, height: 1222 },
      { src: '/pastProjects/project_7/pp_7c.jpg', width: 1478, height: 1642 },
      { src: '/pastProjects/project_7/pp_7d.jpg', width: 988, height: 1128 },
    ]),
  project('8', 'namDong', '2024', [
      { src: '/pastProjects/project_8/pp_8a.jpg', width: 1706, height: 1556 },
      { src: '/pastProjects/project_8/pp_8b.jpg', width: 1718, height: 1502 },
      { src: '/pastProjects/project_8/pp_8c.jpg', width: 2534, height: 1572 },
      { src: '/pastProjects/project_8/pp_8d.jpg', width: 1598, height: 1486 },
      { src: '/pastProjects/project_8/pp_8f.jpg', width: 1538, height: 1500 },
      { src: '/pastProjects/project_8/pp_8g.jpg', width: 2530, height: 1696 },
      { src: '/pastProjects/project_8/pp_8h.jpg', width: 1238, height: 1488 },
      { src: '/pastProjects/project_8/pp_8i.jpg', width: 1770, height: 1478 },
    ]),
  project('9', 'xuanAn', '2024', [
      { src: '/pastProjects/project_9/pp_9a.jpg', width: 1000, height: 681 },
      { src: '/pastProjects/project_9/pp_9b.jpg', width: 1000, height: 678 },
      { src: '/pastProjects/project_9/pp_9c.jpg', width: 1000, height: 695 },
      { src: '/pastProjects/project_9/pp_9d.jpg', width: 2560, height: 1440 },
    ]),
]

export function pastProjectPath(id) {
  return `/past-projects/${id}`
}

function heroCandidate(src, width, height) {
  return { src, width, height }
}

/**
 * Full-bleed detail hero. Listing cards use `cover` from grid_card_images.
 * Honor an explicitly selected hero (the project collage). Without one, use
 * the widest gallery image so a small frame is not blown up across the viewport.
 */
export function pastProjectHeroMedia(project) {
  if (!project) return heroCandidate('', 0, 0)

  if (project.hero) {
    return heroCandidate(project.hero, project.heroWidth || project.width, project.heroHeight || project.height)
  }

  let best = heroCandidate(project.cover, project.width, project.height)

  for (const image of project.images || []) {
    if ((image.width || 0) > (best.width || 0)) {
      best = heroCandidate(image.src, image.width, image.height)
    }
  }

  return best
}

const GALLERY_PREVIEW_WIDTH = 960

/** Touch/phone gallery slides use a 960px WebP; desktop uses the original file. */
export function galleryPreviewSrc(image) {
  if (!image?.src) return ''
  if (!image.width || image.width <= GALLERY_PREVIEW_WIDTH) return image.src
  return image.src.replace(/\.(jpe?g|png|webp)$/i, `-${GALLERY_PREVIEW_WIDTH}.webp`)
}

export function gallerySlideSrc(image, desktop) {
  return desktop ? image.src : galleryPreviewSrc(image)
}

export function getPastProject(projectId) {
  return PAST_PROJECTS.find((project) => project.id === String(projectId)) || null
}

export function getAdjacentPastProjects(projectId) {
  const index = PAST_PROJECTS.findIndex((project) => project.id === String(projectId))
  if (index < 0) return { previous: null, next: null }
  return {
    previous: PAST_PROJECTS[index - 1] || null,
    next: PAST_PROJECTS[index + 1] || null,
  }
}
