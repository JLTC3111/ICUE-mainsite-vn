import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'icue_main_drawer_width';
const MIN_WIDTH = 140;
const MAX_WIDTH = 280;
const DEFAULT_WIDTH = 180;

function clampWidth(width) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

export default function useDrawerResize(drawerRef, handleRef, enabled = true) {
  const stateRef = useRef({
    dragging: false,
    startX: 0,
    startWidth: DEFAULT_WIDTH,
  });

  useEffect(() => {
    const drawer = drawerRef.current;
    const handle = handleRef.current;
    if (!drawer || !handle || !enabled) return;

    const path = window.location.pathname || '';
    if (path.startsWith('/newsroom') || path.startsWith('/people') || path.startsWith('/structure')) return;

    const desktopQuery = window.matchMedia('(min-width: 1441px)');

    const applyWidth = (width) => {
      const next = clampWidth(width);
      drawer.style.setProperty('--drawer-width', `${next}px`);
      drawer.style.width = `${next}px`;
      return next;
    };

    const loadSavedWidth = () => {
      const migrationKey = 'icue_main_drawer_width_v2';
      const saved = Number.parseInt(localStorage.getItem(STORAGE_KEY), 10);

      if (!localStorage.getItem(migrationKey) && Number.isFinite(saved)) {
        const halved = clampWidth(Math.round(saved / 2));
        applyWidth(halved);
        try {
          localStorage.setItem(STORAGE_KEY, String(halved));
          localStorage.setItem(migrationKey, '1');
        } catch (e) {
          // ignore
        }
        return;
      }

      applyWidth(Number.isFinite(saved) ? saved : DEFAULT_WIDTH);
    };

    const syncHandle = () => {
      handle.hidden = !desktopQuery.matches;
    };

    loadSavedWidth();
    syncHandle();
    desktopQuery.addEventListener('change', syncHandle);

    const stopDragging = (event) => {
      const state = stateRef.current;
      if (!state.dragging) return;
      state.dragging = false;
      drawer.classList.remove('is-resizing');
      handle.releasePointerCapture?.(event.pointerId);
      try {
        localStorage.setItem(STORAGE_KEY, String(Math.round(drawer.getBoundingClientRect().width)));
      } catch (e) {
        // ignore
      }
    };

    const onPointerDown = (event) => {
      if (!desktopQuery.matches) return;
      const state = stateRef.current;
      state.dragging = true;
      state.startX = event.clientX;
      state.startWidth = drawer.getBoundingClientRect().width;
      drawer.classList.add('is-resizing');
      handle.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event) => {
      const state = stateRef.current;
      if (!state.dragging) return;
      applyWidth(state.startWidth + (event.clientX - state.startX));
    };

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', stopDragging);
    handle.addEventListener('pointercancel', stopDragging);

    return () => {
      desktopQuery.removeEventListener('change', syncHandle);
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', stopDragging);
      handle.removeEventListener('pointercancel', stopDragging);
    };
  }, [drawerRef, handleRef, enabled]);
}
