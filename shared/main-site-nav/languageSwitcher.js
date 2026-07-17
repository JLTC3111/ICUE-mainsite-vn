import {
  SITES,
  newsroomUrl,
  resolveMainSiteLink,
} from '../site-routes/mainSitePaths.js';

const SITE_CONFIG = {
  vietnamese: {
    domain: 'icue.vn',
    flagClass: 'flag-icon-vn',
    language: 'vi',
  },
  english: {
    domain: 'en.icue.vn',
    flagClass: 'flag-icon-gb',
    language: 'en',
  },
};

const PAGE_MAPPING = {
  Home: 'Home',
  orgStructure: 'orgStructure',
  ourWork: 'ourWork',
  pastProjects: 'pastProjects',
  News: 'News',
  aboutUs: 'aboutUs',
  meetOurExperts: 'meetOurExperts',
  coreTeam: 'coreTeam',
  Contact: 'Contact',
  FAQs: 'FAQs',
  donations: 'donations',
  gdpr: 'gdpr',
  privacy: 'privacy',
  recruitment: 'recruitment',
  terms: 'terms',
  cookies: 'cookies',
  notableAwards: 'notableAwards',
  communityActivities: 'communityActivities',
};

const STATIC_PAGES = [
  'donations', 'gdpr', 'privacy', 'recruitment', 'terms',
  'faqs', 'cookies', 'notableAwards', 'communityActivities',
];

/** Path routes for migrated main-site pages (no hash). */
export const MIGRATED_PAGE_PATHS = {
  Home: '/',
  Contact: '/contact',
  aboutUs: '/about-us',
  ourWork: '/our-work',
  pastProjects: '/past-projects',
  recruitment: '/recruitment',
  News: newsroomUrl('vi'),
  newsArchive: '/src/pages/News.html',
  meetOurExperts: '/people/experts',
  coreTeam: '/people/core-team',
  orgStructure: '/structure/',
  notableAwards: '/notable-awards',
  communityActivities: '/community-activities',
  FAQs: '/faqs',
  donations: '/donations',
  privacy: '/privacy',
  terms: '/terms',
  gdpr: '/gdpr',
  cookies: '/cookies',
};

const PATH_TO_PAGE = Object.fromEntries(
  Object.entries(MIGRATED_PAGE_PATHS).map(([page, path]) => [path, page]),
);

function pageFromHash(hash) {
  if (hash && hash.startsWith('#/')) {
    const page = hash.substring(2).replace(/\/$/, '');
    return page || 'Home';
  }
  return null;
}

export function pageFromPathname(pathname) {
  if (!pathname) return 'Home';
  if (PATH_TO_PAGE[pathname]) return PATH_TO_PAGE[pathname];
  if (pathname === '/') return 'Home';

  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length === 0) return 'Home';

  if (pathSegments[0] === 'people') {
    if (pathSegments.includes('core-team')) return 'coreTeam';
    if (pathSegments.includes('experts')) return 'meetOurExperts';
  }
  if (pathSegments[0] === 'structure') return 'orgStructure';
  if (pathSegments[0] === 'newsroom') return 'News';
  if (pathSegments[0] === 'src' && pathSegments[1] === 'pages' && pathSegments[2] === 'News.html') {
    return 'newsArchive';
  }

  const pathPage = pathSegments[pathSegments.length - 1].replace('.html', '');
  if (pathPage === 'News') return 'newsArchive';
  if (STATIC_PAGES.includes(pathPage.toLowerCase())) {
    return pathPage;
  }
  return pathPage;
}

export function getCurrentPage() {
  const { hash, pathname } = window.location;

  const hashPage = pageFromHash(hash);
  if (hashPage) return hashPage;

  if (typeof window.currentPage !== 'undefined' && window.currentPage) {
    return window.currentPage;
  }

  if (typeof window.__mainSiteNav?.getPage === 'function') {
    const navPage = window.__mainSiteNav.getPage();
    if (navPage) return navPage;
  }

  const activeNavLink = document.querySelector(
    '.nav-drawer__links a.is-current, .nav-drawer__submenu a.is-current, .drawer-menu a.active, [data-page].active, #drawerMenu a.active'
  );
  if (activeNavLink) {
    const dataPage = activeNavLink.getAttribute('data-page');
    if (dataPage) return dataPage;
  }

  return pageFromPathname(pathname);
}

export function syncHashForPage(page) {
  if (!page || page === 'meetOurExperts' || page === 'coreTeam' || page === 'orgStructure') return;

  const migratedPath = MIGRATED_PAGE_PATHS[page];
  if (migratedPath && !window.location.hash) {
    const url = `${migratedPath}${window.location.search}`;
    if (window.location.pathname !== migratedPath) {
      history.replaceState(null, '', url);
    }
    return;
  }

  const targetHash = page === 'Home' ? '#/Home' : `#/${page}`;
  if (window.location.hash === targetHash) return;
  const url = `${window.location.pathname}${window.location.search}${targetHash}`;
  history.replaceState(null, '', url);
}

function mapPageName(pageName, fromLang, toLang) {
  if (fromLang === toLang) return pageName;
  return PAGE_MAPPING[pageName] || pageName;
}

function mainSiteBase(siteLang) {
  return siteLang === 'vi' ? SITES.vi : SITES.en;
}

function buildTargetPath(targetPageName, targetSite) {
  if (targetPageName === 'newsArchive') {
    return `${mainSiteBase(targetSite.language)}/src/pages/News.html`;
  }

  const resolved = resolveMainSiteLink(
    targetPageName,
    targetSite.language,
    mainSiteBase(targetSite.language),
  );
  if (resolved.startsWith('http')) {
    return resolved;
  }

  if (MIGRATED_PAGE_PATHS[targetPageName]) {
    return resolved;
  }
  if (STATIC_PAGES.includes(targetPageName)) {
    return `#/${targetPageName}`;
  }
  return targetPageName === 'Home' ? '#/Home' : `#/${targetPageName}`;
}

export function buildLanguageSwitchTarget() {
  let currentHost = window.location.host;
  const currentSearch = window.location.search;
  const currentProtocol = window.location.protocol;
  const currentHash = window.location.hash;

  if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
    const isEnglishSite =
      currentHost.includes('en') ||
      document.documentElement.lang === 'en' ||
      document.querySelector('meta[name="language"]')?.content === 'en';
    currentHost = isEnglishSite
      ? SITE_CONFIG.english.domain
      : SITE_CONFIG.vietnamese.domain;
  }

  let currentSite;
  let targetSite;

  if (currentHost.startsWith('en.') || currentHost === SITE_CONFIG.english.domain) {
    currentSite = SITE_CONFIG.english;
    targetSite = SITE_CONFIG.vietnamese;
  } else {
    currentSite = SITE_CONFIG.vietnamese;
    targetSite = SITE_CONFIG.english;
  }

  const currentPageName = getCurrentPage();
  const targetPageName = mapPageName(
    currentPageName,
    currentSite.language,
    targetSite.language
  );

  const targetPath = buildTargetPath(targetPageName, targetSite);
  const targetUrl = targetPath.startsWith('http')
    ? targetPath
    : `${currentProtocol}//${targetSite.domain}${targetPath}${currentSearch}`;

  return {
    currentSite,
    targetSite,
    targetUrl,
    currentPageName,
    targetPageName,
    currentHash,
  };
}
