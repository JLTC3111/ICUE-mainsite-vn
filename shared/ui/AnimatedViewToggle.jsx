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

/** Phosphor `video-camera` — from public/phosphor-icons/video-camera.svg
 *  viewBox cropped to glyph width so ink is horizontally centered in the circle. */
function CameraIcon() {
  return (
    <svg viewBox="16 0 236 256" fill="currentColor" aria-hidden="true">
      <path d="M251.77,73a8,8,0,0,0-8.21.39L208,97.05V72a16,16,0,0,0-16-16H32A16,16,0,0,0,16,72V184a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V159l35.56,23.71A8,8,0,0,0,248,184a8,8,0,0,0,8-8V80A8,8,0,0,0,251.77,73ZM192,184H32V72H192V184Zm48-22.95-32-21.33V116.28L240,95Z" />
    </svg>
  );
}

/** Phosphor `video-camera-slash` — from public/phosphor-icons/video-camera-slash.svg */
function CameraSlashIcon() {
  return (
    <svg viewBox="16 0 236 256" fill="currentColor" aria-hidden="true">
      <path d="M251.77,73a8,8,0,0,0-8.21.39L208,97.05V72a16,16,0,0,0-16-16H113.06a8,8,0,0,0,0,16H192v87.63a8,8,0,0,0,16,0V159l35.56,23.71A8,8,0,0,0,248,184a8,8,0,0,0,8-8V80A8,8,0,0,0,251.77,73ZM240,161.05l-32-21.33V116.28L240,95ZM53.92,34.62A8,8,0,1,0,42.08,45.38L51.73,56H32A16,16,0,0,0,16,72V184a16,16,0,0,0,16,16H182.64l19.44,21.38a8,8,0,1,0,11.84-10.76ZM32,184V72H66.28L168.1,184Z" />
    </svg>
  );
}

/**
 * Magic UI Animated Theme Toggler pattern — adapted for boolean view transitions.
 * @see https://magicui.design/docs/components/animated-theme-toggler
 *
 * `onIcon` / `offIcon` default to the camera pair this started life with, so
 * the home page's background-video switch needs no changes. The About page
 * passes a sun and a moon instead — see ThemeToggle.
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
  viewTransitionName = 'icue-avt-video-icon',
  onIcon,
  offIcon,
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

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || typeof document.startViewTransition !== 'function') {
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

  const classes = [
    'animated-view-toggle',
    checked ? 'is-on' : 'is-off',
    className,
  ]
    .filter(Boolean)
    .join(' ');

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
      <span
        className="animated-view-toggle__icons"
        style={{ viewTransitionName }}
        aria-hidden="true"
      >
        <span className={`animated-view-toggle__face animated-view-toggle__face--on${checked ? ' is-active' : ''}`}>
          {onIcon ?? <CameraIcon />}
        </span>
        <span className={`animated-view-toggle__face animated-view-toggle__face--off${!checked ? ' is-active' : ''}`}>
          {offIcon ?? <CameraSlashIcon />}
        </span>
      </span>
      <span className="animated-view-toggle__sr-only">{ariaLabel}</span>
    </button>
  );
}
