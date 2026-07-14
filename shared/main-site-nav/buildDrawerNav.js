import { DRAWER_LINKS, PEOPLE_SUBMENU, STANDALONE_DRAWER_LINKS } from './navLinks';

export function navigateDrawerLink(link, onClose) {
  onClose();

  if (link.href.startsWith('#/')) {
    window.location.hash = link.href;
    return;
  }

  window.location.assign(link.href);
}

export function buildMainSiteDrawerNav({
  activePage,
  onClose,
  links = DRAWER_LINKS,
  peopleSubmenu = PEOPLE_SUBMENU,
  peopleOpen,
  onPeopleToggle,
}) {
  const navLinks = links.map((link, index) => ({
    key: link.page,
    page: link.page,
    href: link.href,
    label: link.label,
    index: index + 1,
    icon: link.icon,
    isCurrent: link.page === activePage,
    onClick: (e) => {
      e.preventDefault();
      navigateDrawerLink(link, onClose);
    },
  }));

  const people = {
    open: peopleOpen,
    onToggle: (e) => {
      e.preventDefault();
      onPeopleToggle();
    },
    label: peopleSubmenu.label,
    index: links.length + 1,
    icon: peopleSubmenu.icon,
    items: peopleSubmenu.items.map((item) => ({
      key: item.page,
      page: item.page,
      href: item.href,
      label: item.label,
      className: item.className,
      icon: item.icon,
      isCurrent: item.page === activePage,
      onClick: (e) => {
        e.preventDefault();
        navigateDrawerLink(item, onClose);
      },
    })),
  };

  return { navLinks, people };
}

export { DRAWER_LINKS, PEOPLE_SUBMENU, STANDALONE_DRAWER_LINKS };
