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

function getCurrentPage() {
  const { hash, pathname } = window.location;

  if (hash && hash.startsWith('#/')) {
    return hash.substring(2);
  }

  if (typeof window.currentPage !== 'undefined' && window.currentPage) {
    return window.currentPage;
  }

  const activeNavLink = document.querySelector(
    '.drawer-menu a.active, [data-page].active, #drawerMenu a.active'
  );
  if (activeNavLink) {
    const dataPage = activeNavLink.getAttribute('data-page');
    if (dataPage) return dataPage;
  }

  if (pathname && pathname !== '/') {
    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      let pathPage = pathSegments[pathSegments.length - 1].replace('.html', '');
      if (STATIC_PAGES.includes(pathPage.toLowerCase())) {
        return pathPage;
      }
      return pathPage;
    }
  }

  return 'Home';
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
