let handlers = null;

export function registerMainSiteNavBridge(nextHandlers) {
  handlers = nextHandlers;

  window.__mainSiteNav = {
    setDrawerOpen: (open) => handlers?.setDrawerOpen?.(open),
    getDrawerOpen: () => handlers?.getDrawerOpen?.() ?? false,
    setDarkNav: (dark) => handlers?.setDarkNav?.(dark),
    setPage: (page) => handlers?.setPage?.(page),
    playEntranceAnimation: (isFirstLoad) =>
      handlers?.playEntranceAnimation?.(isFirstLoad),
    refreshLanguageSwitcher: () => handlers?.refreshLanguageSwitcher?.(),
  };
}

export function getMainSiteNavBridge() {
  return window.__mainSiteNav;
}
