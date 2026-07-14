import { useCallback, useEffect, useRef, useState } from 'react';
import LineSidebarNav from '@icue/drawer-menu/LineSidebarNav.jsx';
import { useLineSidebarProximity } from '@icue/drawer-menu/useLineSidebarProximity.js';
import '@icue/drawer-menu/DrawerMenu.css';
import { DRAWER_LINKS, PEOPLE_SUBMENU } from './navLinks';
import useDrawerResize from './useDrawerResize';

function navigateDrawerLink(link, onClose) {
  onClose();

  if (link.href.startsWith('#/')) {
    window.location.hash = link.href;
    return;
  }

  window.location.assign(link.href);
}

export default function MainSiteDrawer({
  open,
  onClose,
  activePage,
  links = DRAWER_LINKS,
  peopleSubmenu = PEOPLE_SUBMENU,
}) {
  const drawerRef = useRef(null);
  const handleRef = useRef(null);
  const [peopleOpen, setPeopleOpen] = useState(true);

  const isDesktop = () => window.matchMedia('(min-width: 1441px)').matches;
  useDrawerResize(drawerRef, handleRef, isDesktop());

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const { navRef, handlePointerMove, handlePointerLeave } = useLineSidebarProximity({
    enabled: open,
    deps: [peopleOpen, activePage, links, peopleSubmenu],
  });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) return undefined;

    const onOutsideClick = (e) => {
      const drawer = drawerRef.current;
      const toggle = document.getElementById('menuToggle');
      const overlay = document.getElementById('mainSiteDrawerOverlay');
      if (!drawer || !toggle) return;
      if (
        !drawer.contains(e.target)
        && !toggle.contains(e.target)
        && !(overlay && overlay.contains(e.target))
      ) {
        handleClose();
      }
    };

    const timer = window.setTimeout(() => {
      document.addEventListener('click', onOutsideClick);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('click', onOutsideClick);
    };
  }, [open, handleClose]);

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
      navigateDrawerLink(link, handleClose);
    },
  }));

  const people = {
    open: peopleOpen,
    onToggle: (e) => {
      e.preventDefault();
      setPeopleOpen((v) => !v);
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
        navigateDrawerLink(item, handleClose);
      },
    })),
  };

  return (
    <>
      <div
        id="mainSiteDrawerOverlay"
        className={`nav-drawer__overlay ${open ? 'is-open' : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <aside
        ref={drawerRef}
        className={`nav-drawer main-site-drawer ${open ? 'is-open open' : ''}`}
        id="drawerMenu"
        aria-hidden={!open}
      >
        <LineSidebarNav
          links={navLinks}
          people={people}
          navRef={navRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        />

        <button
          ref={handleRef}
          type="button"
          className="drawer-resize-handle"
          id="drawerResizeHandle"
          aria-label="Resize navigation menu"
          title="Drag to resize menu"
        />
      </aside>
    </>
  );
}
