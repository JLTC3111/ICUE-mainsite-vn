import test from 'node:test'
import assert from 'node:assert/strict'
import { React, act, create, silenceRenderer, sourceModule, unmount } from '../../shared/resilience/testHarness.js'

test('illustrative project photos retain their identity and accessible source/license credits without changing gallery labels', async t => {
  silenceRenderer(t)
  const photo = {
    region: 'Lào Cai', title: 'Lào Cai cityscape', author: 'Photographer',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lao_Cai.jpg',
    license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  }
  const project = {
    id: '1', key: 'laoCai', year: '2024', cover: '/illustration.jpg', width: 1200, height: 800,
    photo, images: [{ src: '/original-project-plan.jpg', width: 800, height: 600 }],
  }
  const page = { photoCredit: 'Illustrative photograph', yearCompleted: 'Year completed', scrollHint: 'Scroll to expand' }
  const copy = { title: 'Lào Cai master plan', location: 'Lào Cai City', imageAlt: 'Original planning document' }
  let expand = false
  const window = Object.assign(new EventTarget(), {
    innerHeight: 1000,
    matchMedia: () => Object.assign(new EventTarget(), { matches: false }),
  })
  class ResizeObserver { observe() {} disconnect() {} }
  const imports = {
    'react-router-dom': {
      Link: ({ to, children, ...props }) => React.createElement('a', { ...props, href: to }, children),
      Navigate: () => null,
      useParams: () => ({ projectId: '1' }), useOutletContext: () => ({ theme: 'light' }),
    },
    'react-i18next': { useTranslation: () => ({ t: (key, options) => {
      if (key === 'projects.page') return page
      if (key === 'projects.items') return { laoCai: copy }
      if (key === 'projects.page.illustrationAlt') return `Illustrative photograph of the ${options.location} area`
      return key
    } }) },
    'swiper/modules': { Navigation: {}, Pagination: {} },
    'swiper/css': {}, 'swiper/css/navigation': {}, 'swiper/css/pagination': {},
    'swiper/react': {
      Swiper: ({ children }) => React.createElement('div', null, children),
      SwiperSlide: ({ children }) => React.createElement('div', null, children),
    },
    'lucide-react': { ChevronLeft: () => null, ChevronRight: () => null, X: () => null },
    '../data/pastProjectsContent': {
      PAST_PROJECTS: [project], pastProjectPath: id => `/past-projects/${id}`,
      getPastProject: () => project, getAdjacentPastProjects: () => ({ previous: null, next: null }),
      pastProjectHeroMedia: () => ({ src: project.cover, width: project.width, height: project.height }),
      gallerySlideSrc: image => image.src,
    },
    '../hooks/useHeavyVisualEffects': { useDesktopFinePointer: () => false, useDesktopScrollExpand: () => expand },
    '../hooks/useSwiperNavContrast': { useSwiperNavContrast() {} },
    '../components/ProjectLightbox': { default: () => null },
    '../lib/responsiveImage': { coverSrcSet: () => undefined, heroSrcSet: () => undefined, PAST_PROJECT_CARD_SIZES: '100vw', PAST_PROJECT_HERO_SIZES: '100vw' },
  }
  const globals = { window, document: { documentElement: { dataset: {} } }, ResizeObserver }
  const { default: PastProjectsPage } = await sourceModule('home-app/src/pages/PastProjectsPage.jsx', { imports, globals })
  let listing
  await act(async () => { listing = create(React.createElement(PastProjectsPage)) })
  const cover = listing.root.findByType('img')
  assert.equal(cover.props.alt, 'Illustrative photograph of the Lào Cai area')
  assert.match(cover.props.title, /Lào Cai cityscape — Photographer \(CC BY-SA 4\.0\)/)
  await unmount(listing)

  const { default: PastProjectDetailPage } = await sourceModule('home-app/src/pages/PastProjectDetailPage.jsx', { imports, globals })
  let detail
  const createNodeMock = () => ({ style: {}, clientHeight: 1000, getBoundingClientRect: () => ({ top: 0 }) })
  await act(async () => { detail = create(React.createElement(PastProjectDetailPage), { createNodeMock }) })
  const verifyPhoto = () => {
    const hero = detail.root.findAllByType('img').find(image => image.props.src === '/illustration.jpg')
    assert.equal(hero.props.alt, 'Illustrative photograph of the Lào Cai area')
    assert.match(hero.props.title, /Illustrative photograph: Lào Cai cityscape/)
    assert.equal(detail.root.findByProps({ src: '/original-project-plan.jpg' }).props.alt, 'Lào Cai master plan — 1')
    for (const href of [photo.sourceUrl, photo.licenseUrl]) {
      const credit = detail.root.findByProps({ href })
      assert.equal(credit.props.target, '_blank')
      assert.equal(credit.props.rel, 'noopener noreferrer')
      assert.notEqual(credit.props.tabIndex, -1)
      for (let ancestor = credit.parent; ancestor; ancestor = ancestor.parent) {
        assert.notEqual(ancestor.props['aria-hidden'], 'true', 'visible credits stay exposed to assistive technology')
      }
    }
  }
  verifyPhoto()
  expand = true
  await act(async () => detail.update(React.createElement(PastProjectDetailPage)))
  verifyPhoto()
  await unmount(detail)
})
