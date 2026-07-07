import { useCallback, useEffect, useRef, useState } from 'react';
import { DRAWER_LINKS, PEOPLE_SUBMENU } from './navLinks';
import useDrawerResize from './useDrawerResize';

function navigateDrawerLink(link, onClose) {
  onClose();

  if (link.href.startsWith('#/')) {
    window.location.hash = link.href;
    return;
  }

  window.location.href = link.href;
}

export default function MainSiteDrawer({ open, onClose }) {
  const drawerRef = useRef(null);
  const handleRef = useRef(null);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [peopleClosing, setPeopleClosing] = useState(false);

  const isDesktop = () => window.matchMedia('(min-width: 1441px)').matches;
  useDrawerResize(drawerRef, handleRef, isDesktop());

  const closePeopleSubmenu = useCallback(() => {
    if (!peopleOpen) return;
    setPeopleOpen(false);
    setPeopleClosing(true);
    window.setTimeout(() => setPeopleClosing(false), 300);
  }, [peopleOpen]);

  const handleClose = useCallback(() => {
    closePeopleSubmenu();
    onClose();
  }, [closePeopleSubmenu, onClose]);

  useEffect(() => {
    if (!open) {
      closePeopleSubmenu();
    }
  }, [open, closePeopleSubmenu]);

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
      if (!drawer || !toggle) return;
      if (!drawer.contains(e.target) && !toggle.contains(e.target)) {
        handleClose();
      }
    };

    // Defer so the click that opened the drawer does not immediately close it.
    const timer = window.setTimeout(() => {
      document.addEventListener('click', onOutsideClick);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('click', onOutsideClick);
    };
  }, [open, handleClose]);

  const togglePeople = (e) => {
    e.preventDefault();
    if (peopleOpen) {
      closePeopleSubmenu();
    } else {
      setPeopleClosing(false);
      setPeopleOpen(true);
    }
  };

  const submenuClass = [
    'submenu',
    peopleOpen ? 'open' : '',
    peopleClosing ? 'closing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={drawerRef}
      className={`drawer-menu ${open ? 'open' : ''}`}
      id="drawerMenu"
      aria-hidden={!open}
    >
      <div className="drawer-blur-overlay" aria-hidden="true" />
      <button
        ref={handleRef}
        type="button"
        className="drawer-resize-handle"
        id="drawerResizeHandle"
        aria-label="Resize navigation menu"
        title="Drag to resize menu"
      />

      {DRAWER_LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <a
            key={link.page}
            href={link.href}
            data-page={link.page}
            onClick={(e) => {
              e.preventDefault();
              navigateDrawerLink(link, handleClose);
            }}
          >
            <Icon />
            {link.label}
          </a>
        );
      })}

      <a
        href="#"
        className="has-submenu"
        data-page={PEOPLE_SUBMENU.page}
        onClick={togglePeople}
      >
        <PEOPLE_SUBMENU.icon />
        {PEOPLE_SUBMENU.label}
      </a>

      <div id="ourPeopleSubmenu" className={submenuClass}>
        {PEOPLE_SUBMENU.items.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.page}
              href={item.href}
              data-page={item.page}
              className={item.className}
              onClick={(e) => {
                e.preventDefault();
                navigateDrawerLink(item, handleClose);
              }}
            >
              <Icon />
              {item.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
