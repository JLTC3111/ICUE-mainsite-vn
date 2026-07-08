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

function pageFromHash(hash) {
  if (hash && hash.startsWith('#/')) {
    const page = hash.substring(2).replace(/\/$/, '');
    return page || 'Home';
  }
  return null;
}

function pageFromPathname(pathname) {
  if (!pathname || pathname === '/') return null;

  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length === 0) return null;

  if (pathSegments[0] === 'people') {
    if (pathSegments.includes('core-team')) return 'coreTeam';
    if (pathSegments.includes('experts')) return 'meetOurExperts';
  }
  if (pathSegments[0] === 'structure') return 'orgStructure';

  let pathPage = pathSegments[pathSegments.length - 1].replace('.html', '');
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
    '.drawer-menu a.active, [data-page].active, #drawerMenu a.active'
  );
  if (activeNavLink) {
    const dataPage = activeNavLink.getAttribute('data-page');
    if (dataPage) return dataPage;
  }

  const pathPage = pageFromPathname(pathname);
  if (pathPage) return pathPage;

  return 'Home';
}

export function syncHashForPage(page) {
  if (!page || page === 'meetOurExperts' || page === 'coreTeam' || page === 'orgStructure') return;
  const targetHash = page === 'Home' ? '#/Home' : `#/${page}`;
  if (window.location.hash === targetHash) return;
  const url = `${window.location.pathname}${window.location.search}${targetHash}`;
  history.replaceState(null, '', url);
}

function mapPageName(pageName, fromLang, toLang) {
  if (fromLang === toLang) return pageName;
  return PAGE_MAPPING[pageName] || pageName;
}

export function buildLanguageSwitchTarget() {
  let currentHost = window.location.host;
  const currentPath = window.location.pathname;
  const currentHash = window.location.hash;
  const currentSearch = window.location.search;
  const currentProtocol = window.location.protocol;

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

  let targetPath = '';
  if (targetPageName === 'Home') {
    targetPath = '#/Home';
  } else if (targetPageName === 'meetOurExperts') {
    targetPath = '/people/experts';
  } else if (targetPageName === 'coreTeam') {
    targetPath = '/people/core-team';
  } else if (targetPageName === 'orgStructure') {
    targetPath = '/structure/';
  } else if (STATIC_PAGES.includes(targetPageName)) {
    targetPath = `#/${targetPageName}`;
  } else {
    targetPath = `#/${targetPageName}`;
  }

  const targetUrl = `${currentProtocol}//${targetSite.domain}${targetPath}${currentSearch}`;

  return {
    currentSite,
    targetSite,
    targetUrl,
    currentPageName,
    targetPageName,
    currentHash,
  };
}
