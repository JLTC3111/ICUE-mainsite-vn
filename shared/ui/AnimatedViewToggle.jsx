import { useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import './animated-view-toggle.css';

function polygonCollapsed(cx, cy, vertexCount) {
  const pairs = Array.from({ length: vertexCount }, () => `${cx}px ${cy}px`).join(', ');
  return `polygon(${pairs})`;
}

function getTransitionClipPaths(
  variant,
  cx,
  cy,
  maxRadius,
  viewportWidth,
  viewportHeight,
) {
  switch (variant) {
    case 'square': {
      const halfW = Math.max(cx, viewportWidth - cx);
      const halfH = Math.max(cy, viewportHeight - cy);
      const halfSide = Math.max(halfW, halfH) * 1.05;
      const end = [
        `${cx - halfSide}px ${cy - halfSide}px`,
        `${cx + halfSide}px ${cy - halfSide}px`,
        `${cx + halfSide}px ${cy + halfSide}px`,
        `${cx - halfSide}px ${cy + halfSide}px`,
      ].join(', ');
      return [polygonCollapsed(cx, cy, 4), `polygon(${end})`];
    }
    case 'diamond': {
      const radius = maxRadius * Math.SQRT2;
      const end = [
        `${cx}px ${cy - radius}px`,
        `${cx + radius}px ${cy}px`,
        `${cx}px ${cy + radius}px`,
        `${cx - radius}px ${cy}px`,
      ].join(', ');
      return [polygonCollapsed(cx, cy, 4), `polygon(${end})`];
    }
    case 'circle':
    default:
      return [
        `circle(0px at ${cx}px ${cy}px)`,
        `circle(${maxRadius}px at ${cx}px ${cy}px)`,
      ];
  }
}

function VideoOnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 10.2 21 7.5v9L16 13.8V10.2Z" fill="currentColor" />
    </svg>
  );
}

function VideoOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="11" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M15 10.5 19 8v8l-4-2.5v-3Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Magic UI Animated Theme Toggler pattern — adapted for boolean view transitions.
 * @see https://magicui.design/docs/components/animated-theme-toggler
 */
export default function AnimatedViewToggle({
  className = '',
  duration = 450,
  variant = 'circle',
  fromCenter = false,
  checked = false,
  onCheckedChange,
  disabled = false,
  ariaLabel,
  ...props
}) {
  const buttonRef = useRef(null);

  const toggle = useCallback(() => {
    if (disabled) return;

    const button = buttonRef.current;
    if (!button || button.dataset.transitioning === 'true') return;

    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

    let x;
    let y;
    if (fromCenter) {
      x = viewportWidth / 2;
      y = viewportHeight / 2;
    } else {
      const { top, left, width, height } = button.getBoundingClientRect();
      x = left + width / 2;
      y = top + height / 2;
    }

    const maxRadius = Math.hypot(
      Math.max(x, viewportWidth - x),
      Math.max(y, viewportHeight - y),
    );

    const applyChange = () => {
      onCheckedChange?.(!checked);
    };

    if (typeof document.startViewTransition !== 'function') {
      applyChange();
      return;
    }

    button.dataset.transitioning = 'true';

    const clipPath = getTransitionClipPaths(
      variant,
      x,
      y,
      maxRadius,
      viewportWidth,
      viewportHeight,
    );

    const root = document.documentElement;
    root.dataset.icueViewToggleVt = 'active';
    root.style.setProperty('--icue-view-toggle-vt-duration', `${duration}ms`);
    root.style.setProperty('--icue-view-toggle-vt-clip-from', clipPath[0]);

    const cleanup = () => {
      delete button.dataset.transitioning;
      delete root.dataset.icueViewToggleVt;
      root.style.removeProperty('--icue-view-toggle-vt-duration');
      root.style.removeProperty('--icue-view-toggle-vt-clip-from');
    };

    const transition = document.startViewTransition(() => {
      flushSync(applyChange);
    });

    if (typeof transition?.finished?.finally === 'function') {
      transition.finished.finally(cleanup);
    } else {
      cleanup();
    }

    const ready = transition?.ready;
    if (ready && typeof ready.then === 'function') {
      ready.then(() => {
        document.documentElement.animate(
          { clipPath },
          {
            duration,
            easing: 'ease-in-out',
            fill: 'forwards',
            pseudoElement: '::view-transition-new(root)',
          },
        );
      });
    }
  }, [checked, disabled, duration, fromCenter, onCheckedChange, variant]);

  const classes = ['animated-view-toggle', className].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      ref={buttonRef}
      className={classes}
      onClick={toggle}
      disabled={disabled}
      aria-pressed={checked}
      aria-label={ariaLabel}
      {...props}
    >
      {checked ? <VideoOffIcon /> : <VideoOnIcon />}
      <span className="animated-view-toggle__sr-only">{ariaLabel}</span>
    </button>
  );
}
