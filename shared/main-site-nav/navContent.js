/**
 * Every word the site chrome says, in one place.
 *
 * The nav and footer are injected into pages that do not otherwise share a
 * language: the home app is Vietnamese, the Contact app carries six UI
 * languages of its own. Both render this same component tree, so the copy has
 * to be a prop rather than a constant — pass `labels` to MainSiteNav and it
 * flows down to the drawer, the pill header and the aria strings.
 *
 * Omit it and you get these Vietnamese defaults, which is what every page that
 * has not been localized still shows.
 */
export const NAV_LABELS = {
  /** Full destination names — the drawer, and the pill's accessible name. */
  pages: {
    Home: 'Trang Chủ',
    orgStructure: 'Cơ Cấu & Tổ Chức',
    ourWork: 'Công Việc',
    pastProjects: 'Đề Tài, Dự Án',
    News: 'Tin Tức & Sự Kiện',
    aboutUs: 'Về Chúng Tôi',
    Contact: 'Liên Hệ',
    ourPeople: 'Nhân Lực',
    meetOurExperts: 'Chuyên Gia',
    coreTeam: 'Cán Bộ',
  },
  /** Shorter forms for the pill, where a long label breaks the row. */
  compact: {
    Home: 'Trang Chủ',
    orgStructure: 'Cơ Cấu',
    ourWork: 'Công Việc',
    pastProjects: 'Dự Án',
    News: 'Tin Tức',
    aboutUs: 'Giới Thiệu',
  },
  aria: {
    nav: 'Điều hướng trang',
    home: 'Về trang chủ',
    more: 'Mở thêm mục điều hướng',
    moreLabel: 'Thêm',
    overflow: 'Thêm mục điều hướng',
    openMenu: 'Mở trình đơn đầy đủ',
    toggleMenu: 'Bật/tắt trình đơn điều hướng',
    closeMenu: 'Đóng trình đơn điều hướng',
    resizeMenu: 'Thay đổi kích thước trình đơn',
    resizeMenuTitle: 'Kéo để thay đổi kích thước trình đơn',
    homeVideo: 'Bật/tắt video nền',
    aboutUsVideo: 'Bật/tắt video nền (Giới thiệu)',
    aboutUsTheme: 'Chuyển giao diện sáng/tối (Giới thiệu)',
  },
  /** The dock variant's wordmark link, set in video-filled capitals. */
  contactWordmark: 'GIỚI THIỆU',
}

/**
 * Shallow-merges one level down, so a caller can override `pages` without
 * having to restate `aria`, and can leave individual keys inside either group
 * to the defaults.
 */
export function resolveNavLabels(overrides) {
  // A missing `nav` key makes i18next hand back the key string rather than the
  // block; spreading that would fill `pages` with character indices. Falling
  // back to the defaults keeps the nav readable instead.
  if (!overrides || typeof overrides !== 'object') return NAV_LABELS
  return {
    ...NAV_LABELS,
    ...overrides,
    pages: { ...NAV_LABELS.pages, ...overrides.pages },
    compact: { ...NAV_LABELS.compact, ...overrides.compact },
    aria: { ...NAV_LABELS.aria, ...overrides.aria },
  }
}

/** Re-labels a link list by page key, leaving hrefs and icons alone. */
export function localizeNavLinks(links, labels) {
  return links.map((link) => {
    const label = labels.pages[link.page]
    return label && label !== link.label ? { ...link, label } : link
  })
}

/** Same, for the People group and the two entries under it. */
export function localizePeopleSubmenu(submenu, labels) {
  return {
    ...submenu,
    label: labels.pages[submenu.page] ?? submenu.label,
    items: localizeNavLinks(submenu.items, labels),
  }
}
