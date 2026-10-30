/** Static past-project records. Copy lives in `projects.items` locale keys. */
import { PAST_PROJECT_COVERS } from './pastProjectCovers.js'

function projectCover(id) {
  const cover = PAST_PROJECT_COVERS[id]
  return {
    cover: cover.src,
    width: cover.width,
    height: cover.height,
    hero: cover.src,
    heroWidth: cover.width,
    heroHeight: cover.height,
  }
}

export const PAST_PROJECTS = [
  {
    id: '1',
    key: 'laoCai',
    year: '2024',
    ...projectCover('1'),
    images: [
      { src: '/pastProjects/project_1/pp_1a.jpg', width: 2047, height: 1448 },
      { src: '/pastProjects/project_1/pp_1b.jpg', width: 1015, height: 657 },
      { src: '/pastProjects/project_1/pp_1c.jpg', width: 1024, height: 1450 },
      { src: '/pastProjects/project_1/pp_1d.jpg', width: 1024, height: 631 },
      { src: '/pastProjects/project_1/pp_1e.jpg', width: 1024, height: 1048 },
    ],
  },
  {
    id: '2',
    key: 'hopThanh',
    year: '2025',
    ...projectCover('2'),
    images: [
      { src: '/pastProjects/project_2/pp_2a.jpg', width: 1904, height: 1070 },
      { src: '/pastProjects/project_2/pp_2b.jpg', width: 900, height: 716 },
      { src: '/pastProjects/project_2/pp_2c.jpg', width: 700, height: 466 },
      { src: '/pastProjects/project_2/pp_2d.jpg', width: 1836, height: 1224 },
      { src: '/pastProjects/project_2/pp_2e.jpg', width: 2382, height: 1256 },
    ],
  },
  {
    id: '3',
    key: 'subdivision6b',
    year: '2025',
    ...projectCover('3'),
    images: [
      { src: '/pastProjects/project_3/pp_3a.jpg', width: 1125, height: 819 },
      { src: '/pastProjects/project_3/pp_3b.jpg', width: 1412, height: 1842 },
      { src: '/pastProjects/project_3/pp_3c.jpg', width: 1920, height: 980 },
      { src: '/pastProjects/project_3/pp_3d.jpg', width: 960, height: 720 },
    ],
  },
  {
    id: '4',
    key: 'cocSan',
    year: '2025',
    ...projectCover('4'),
    images: [
      { src: '/pastProjects/project_4/pp_4a.webp', width: 460, height: 312 },
      { src: '/pastProjects/project_4/pp_4b.webp', width: 474, height: 316 },
      { src: '/pastProjects/project_4/pp_4c.webp', width: 1200, height: 630 },
      { src: '/pastProjects/project_4/pp_4d.webp', width: 960, height: 720 },
    ],
  },
  {
    id: '5',
    key: 'dongYen',
    year: '2024',
    ...projectCover('5'),
    images: [
      { src: '/pastProjects/project_5/pp_5a.jpg', width: 1500, height: 1033 },
      { src: '/pastProjects/project_5/pp_5b.jpg', width: 768, height: 1007 },
      { src: '/pastProjects/project_5/pp_5c.jpg', width: 800, height: 568 },
      { src: '/pastProjects/project_5/pp_5d.jpg', width: 3300, height: 2550 },
      { src: '/pastProjects/project_5/pp_5e.jpg', width: 1676, height: 1212 },
    ],
  },
  {
    id: '6',
    key: 'naChi',
    year: '2024',
    ...projectCover('6'),
    images: [
      { src: '/pastProjects/project_6/pp_6a.jpg', width: 1462, height: 664 },
      { src: '/pastProjects/project_6/pp_6b.jpg', width: 1200, height: 857 },
      { src: '/pastProjects/project_6/pp_6c.jpg', width: 793, height: 1000 },
      { src: '/pastProjects/project_6/pp_6d.jpg', width: 650, height: 524 },
      { src: '/pastProjects/project_6/pp_6e.jpg', width: 659, height: 874 },
      { src: '/pastProjects/project_6/pp_6f.jpg', width: 500, height: 378 },
    ],
  },
  {
    id: '7',
    key: 'tanBac',
    year: '2024',
    ...projectCover('7'),
    images: [
      { src: '/pastProjects/project_7/pp_7a.jpg', width: 1020, height: 1072 },
      { src: '/pastProjects/project_7/pp_7b.jpg', width: 1076, height: 1222 },
      { src: '/pastProjects/project_7/pp_7c.jpg', width: 1478, height: 1642 },
      { src: '/pastProjects/project_7/pp_7d.jpg', width: 988, height: 1128 },
    ],
  },
  {
    id: '8',
    key: 'namDong',
    year: '2024',
    ...projectCover('8'),
    images: [
      { src: '/pastProjects/project_8/pp_8a.jpg', width: 1706, height: 1556 },
      { src: '/pastProjects/project_8/pp_8b.jpg', width: 1718, height: 1502 },
      { src: '/pastProjects/project_8/pp_8c.jpg', width: 2534, height: 1572 },
      { src: '/pastProjects/project_8/pp_8d.jpg', width: 1598, height: 1486 },
      { src: '/pastProjects/project_8/pp_8f.jpg', width: 1538, height: 1500 },
      { src: '/pastProjects/project_8/pp_8g.jpg', width: 2530, height: 1696 },
      { src: '/pastProjects/project_8/pp_8h.jpg', width: 1238, height: 1488 },
      { src: '/pastProjects/project_8/pp_8i.jpg', width: 1770, height: 1478 },
    ],
  },
  {
    id: '9',
    key: 'xuanAn',
    year: '2024',
    ...projectCover('9'),
    images: [
      { src: '/pastProjects/project_9/pp_9a.jpg', width: 1000, height: 681 },
      { src: '/pastProjects/project_9/pp_9b.jpg', width: 1000, height: 678 },
      { src: '/pastProjects/project_9/pp_9c.jpg', width: 1000, height: 695 },
      { src: '/pastProjects/project_9/pp_9d.jpg', width: 2560, height: 1440 },
    ],
  },
]

export function pastProjectPath(id) {
  return `/past-projects/${id}`
}

function heroCandidate(src, width, height) {
  return { src, width, height }
}

/**
 * Full-bleed detail hero. Listing cards keep the smaller `cover`.
 * Honor an explicitly selected hero. Without one, use the widest gallery image
 * so a small collage thumbnail is not blown up across the viewport.
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
