import { useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import './animated-view-toggle.css';

function polygonCollapsed(point, vertexCount) {
  const pairs = Array.from({ length: vertexCount }, () => point).join(', ');
  return `polygon(${pairs})`;
}

// Percentage coords against the snapshot reference box — absolute px on
// ::view-transition-new(root) mis-scale on fractional display zoom (e.g. 150%).
function getTransitionClipPaths(
  variant,
  cx,
  cy,
  maxRadius,
  viewportWidth,
  viewportHeight,
) {
  const toX = (x) => `${(x / viewportWidth) * 100}%`;
  const toY = (y) => `${(y / viewportHeight) * 100}%`;
  const point = (x, y) => `${toX(x)} ${toY(y)}`;
  // circle() % radii resolve against hypot(w, h) / sqrt(2) of the reference box.
  const toRadius = (r) =>
    `${(r / (Math.hypot(viewportWidth, viewportHeight) / Math.SQRT2)) * 100}%`;

  switch (variant) {
    case 'circle':
      return [
        `circle(0% at ${point(cx, cy)})`,
        `circle(${toRadius(maxRadius)} at ${point(cx, cy)})`,
      ];
    case 'square': {
      const halfW = Math.max(cx, viewportWidth - cx);
      const halfH = Math.max(cy, viewportHeight - cy);
      const halfSide = Math.max(halfW, halfH) * 1.05;
      const end = [
        point(cx - halfSide, cy - halfSide),
        point(cx + halfSide, cy - halfSide),
        point(cx + halfSide, cy + halfSide),
        point(cx - halfSide, cy + halfSide),
      ].join(', ');
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`];
    }
    case 'triangle': {
      const scale = maxRadius * 2.2;
      const dx = (Math.sqrt(3) / 2) * scale;
      const verts = [
        point(cx, cy - scale),
        point(cx + dx, cy + 0.5 * scale),
        point(cx - dx, cy + 0.5 * scale),
      ].join(', ');
      return [polygonCollapsed(point(cx, cy), 3), `polygon(${verts})`];
    }
    case 'diamond': {
      const R = maxRadius * Math.SQRT2;
      const end = [
        point(cx, cy - R),
        point(cx + R, cy),
        point(cx, cy + R),
        point(cx - R, cy),
      ].join(', ');
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`];
    }
    case 'hexagon': {
      const R = maxRadius * Math.SQRT2;
      const verts = [];
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 3;
        verts.push(point(cx + R * Math.cos(a), cy + R * Math.sin(a)));
      }
      return [
        polygonCollapsed(point(cx, cy), 6),
        `polygon(${verts.join(', ')})`,
      ];
    }
    case 'rectangle': {
      const halfW = Math.max(cx, viewportWidth - cx);
      const halfH = Math.max(cy, viewportHeight - cy);
      const end = [
        point(cx - halfW, cy - halfH),
        point(cx + halfW, cy - halfH),
        point(cx + halfW, cy + halfH),
        point(cx - halfW, cy + halfH),
      ].join(', ');
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`];
    }
    case 'star': {
      const R = maxRadius * Math.SQRT2 * 1.03;
      const innerRatio = 0.42;
      const starPolygon = (radius) => {
        const verts = [];
        for (let i = 0; i < 5; i++) {
          const outerA = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          verts.push(
            point(cx + radius * Math.cos(outerA), cy + radius * Math.sin(outerA)),
          );
          const innerA = outerA + Math.PI / 5;
          verts.push(
            point(
              cx + radius * innerRatio * Math.cos(innerA),
              cy + radius * innerRatio * Math.sin(innerA),
            ),
          );
        }
        return `polygon(${verts.join(', ')})`;
      };
      const startR = Math.max(2, R * 0.025);
      return [starPolygon(startR), starPolygon(R)];
    }
    default:
      return [
        `circle(0% at ${point(cx, cy)})`,
        `circle(${toRadius(maxRadius)} at ${point(cx, cy)})`,
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
  const shape = variant ?? 'circle';
  const buttonRef = useRef(null);
  const isTransitioningRef = useRef(false);

  const toggle = useCallback(() => {
    if (disabled) return;

    const button = buttonRef.current;
    if (
      !button ||
      isTransitioningRef.current ||
      document.documentElement.dataset.icueViewToggleVt === 'active'
    ) {
      return;
    }

    // innerWidth/innerHeight (not visualViewport): percentages must resolve
    // against the snapshot reference box, which includes classic scrollbars.
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

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

    const clipPath = getTransitionClipPaths(
      shape,
      x,
      y,
      maxRadius,
      viewportWidth,
      viewportHeight,
    );

    const root = document.documentElement;
    root.dataset.icueViewToggleVt = 'active';
    root.style.setProperty('--icue-view-toggle-vt-duration', `${duration}ms`);
    // Pin collapsed clip-path so Firefox does not paint unclipped between
    // snapshot and the ready.then() JS animation.
    root.style.setProperty('--icue-view-toggle-vt-clip-from', clipPath[0]);

    const cleanup = () => {
      isTransitioningRef.current = false;
      delete root.dataset.icueViewToggleVt;
      root.style.removeProperty('--icue-view-toggle-vt-duration');
      root.style.removeProperty('--icue-view-toggle-vt-clip-from');
    };

    isTransitioningRef.current = true;
    const transition = document.startViewTransition(() => {
      flushSync(applyChange);
    });

    if (typeof transition?.finished?.finally === 'function') {
      transition.finished.finally(cleanup).catch(() => {});
    } else {
      cleanup();
    }

    const ready = transition?.ready;
    if (ready && typeof ready.then === 'function') {
      ready
        .then(() => {
          document.documentElement.animate(
            { clipPath },
            {
              duration,
              easing: shape === 'star' ? 'linear' : 'ease-in-out',
              fill: 'forwards',
              pseudoElement: '::view-transition-new(root)',
            },
          );
        })
        .catch(() => {});
    }
  }, [checked, disabled, duration, fromCenter, onCheckedChange, shape]);

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
