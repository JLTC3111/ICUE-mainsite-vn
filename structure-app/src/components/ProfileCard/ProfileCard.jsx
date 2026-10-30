// Adapted from React Bits Profile Card (JavaScript + CSS), checked 2026-10-30.
// https://reactbits.dev/components/profile-card — David Haz and contributors.

import { memo, useEffect, useRef } from 'react';

import './ProfileCard.css';

const THEMES = {
  dark: {
    '--pc-frame': 'rgba(38, 35, 46, 0.66)',
    '--pc-frame-edge': 'rgba(255, 255, 255, 0.08)',
    '--pc-frame-highlight': 'rgba(255, 255, 255, 0.07)',
    '--pc-frame-shadow': '0 22px 44px -20px rgba(0, 0, 0, 0.8), 0 6px 16px -8px rgba(0, 0, 0, 0.5)',
    '--pc-tile': 'linear-gradient(180deg, #3a3644 0%, #27242f 100%)',
    '--pc-tile-edge': 'rgba(255, 255, 255, 0.07)',
    '--pc-tile-highlight': 'rgba(255, 255, 255, 0.12)',
    '--pc-tile-shadow': '0 4px 10px -4px rgba(0, 0, 0, 0.7)',
    '--pc-ink': '#f4f4f5',
    '--pc-muted': 'rgba(244, 244, 245, 0.6)',
    '--pc-hover': 'brightness(1.12)',
    '--pc-press': 'brightness(0.8)',
    '--pc-shade': 'rgba(0, 0, 0, 0.4)'
  },
  light: {
    '--pc-frame': 'rgba(240, 240, 243, 0.8)',
    '--pc-frame-edge': 'rgba(24, 24, 27, 0.07)',
    '--pc-frame-highlight': 'rgba(255, 255, 255, 0.95)',
    '--pc-frame-shadow': '0 22px 44px -22px rgba(24, 24, 27, 0.3), 0 6px 16px -10px rgba(24, 24, 27, 0.16)',
    '--pc-tile': 'linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%)',
    '--pc-tile-edge': 'rgba(24, 24, 27, 0.08)',
    '--pc-tile-highlight': 'rgba(255, 255, 255, 1)',
    '--pc-tile-shadow': '0 4px 10px -5px rgba(24, 24, 27, 0.25)',
    '--pc-ink': '#27272a',
    '--pc-muted': 'rgba(39, 39, 42, 0.6)',
    '--pc-hover': 'brightness(0.97)',
    '--pc-press': 'brightness(0.92)',
    '--pc-shade': 'rgba(24, 24, 27, 0.14)'
  }
};

const FOILS = {
  dark: {
    '--pc-blend': 'color-dodge',
    '--pc-holo-filter': 'hue-rotate(0deg)',
    '--pc-sheen': 'rgba(255, 255, 255, 0.16)'
  },
  light: {
    '--pc-blend': 'multiply',
    '--pc-holo-filter': 'invert(1) hue-rotate(180deg)',
    '--pc-sheen': 'rgba(255, 255, 255, 0)'
  }
};

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'><filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0.55 0 0 0 -0.24 0.55 0 0 0 -0.24 0.55 0 0 0 -0.24 0 0 0 0 1'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>"
)}")`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const isDark = color => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color).trim());
  if (!match) return null;
  const hex = match[1].length === 3 ? match[1].replace(/./g, digit => digit + digit) : match[1];
  const [r, g, b] = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
};

const ProfileCard = ({
  avatarUrl = '',
  iconUrl,
  miniAvatarUrl,
  name = 'Javi A. Torres',
  title = 'Software Engineer',
  handle = 'javicodes',
  status = 'Online',
  statusColor = '#22c55e',
  contactText = 'Contact',
  showUserInfo = true,
  onContactClick,
  theme = 'dark',
  backdropColor,
  radius = 16,
  holo = 0.8,
  glare = 0.5,
  enableTilt = true,
  tiltStrength = 12,
  parallax = 8,
  enableMobileTilt = false,
  mobileTiltSensitivity = 5,
  intro,
  // Compatibility with the existing ICUE card customizations.
  animateEntrance,
  grainUrl,
  innerGradient,
  behindGlowEnabled = false,
  behindGlowColor = 'rgba(54, 138, 223, 0.55)',
  behindGlowSize = '50%',
  className = ''
}) => {
  const rootRef = useRef(null);
  const engineRef = useRef(null);
  const settings = { enableTilt, tiltStrength, parallax, mobileTiltSensitivity, intro: intro ?? animateEntrance ?? true };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let reduced = motionQuery?.matches ?? false;
    const size = { width: root.offsetWidth, height: root.offsetHeight };
    const x = { p: 0, v: 0, target: 0 };
    const y = { p: 0, v: 0, target: 0 };
    const light = { p: 0, target: 0 };
    let raf = 0;
    let last = 0;
    let slowUntil = 0;
    let touchId = null;

    const write = () => {
      const { enableTilt: tiltOn, tiltStrength: strength, parallax: depth } = settingsRef.current;
      const angle = tiltOn && !reduced ? strength : 0;
      const tilt = Math.min(1, Math.hypot(x.p, y.p));
      const style = root.style;
      style.setProperty('--pc-light-x', `${((x.p + 1) * 0.5 * size.width).toFixed(1)}px`);
      style.setProperty('--pc-light-y', `${((y.p + 1) * 0.5 * size.height).toFixed(1)}px`);
      style.setProperty('--pc-pointer-x', `${((x.p + 1) * 50).toFixed(2)}%`);
      style.setProperty('--pc-pointer-y', `${((y.p + 1) * 50).toFixed(2)}%`);
      style.setProperty('--pc-band-x', `${(50 + x.p * 15).toFixed(2)}%`);
      style.setProperty('--pc-band-y', `${(50 + y.p * 15).toFixed(2)}%`);
      style.setProperty('--pc-rotate-x', `${(y.p * angle).toFixed(3)}deg`);
      style.setProperty('--pc-rotate-y', `${(-x.p * angle).toFixed(3)}deg`);
      style.setProperty('--pc-shift-x', `${(x.p * (tiltOn && !reduced ? depth : 0)).toFixed(2)}px`);
      style.setProperty('--pc-shift-y', `${(y.p * (tiltOn && !reduced ? depth : 0)).toFixed(2)}px`);
      style.setProperty('--pc-reach', tilt.toFixed(4));
      style.setProperty('--pc-tilt', (tilt * light.p).toFixed(4));
      style.setProperty('--pc-active', light.p.toFixed(4));
    };

    const frame = now => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      const slow = now < slowUntil;
      const stiffness = slow ? 24 : 120;
      const damping = slow ? 9 : 16;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        for (const axis of [x, y]) {
          axis.v += (stiffness * (axis.target - axis.p) - damping * axis.v) * h;
          axis.p += axis.v * h;
        }
      }
      const tau = light.target > light.p ? 0.18 : slow ? 0.9 : 0.45;
      light.p += (light.target - light.p) * (1 - Math.exp(-dt / tau));
      write();
      const moving =
        Math.abs(x.target - x.p) > 0.0005 ||
        Math.abs(y.target - y.p) > 0.0005 ||
        Math.abs(x.v) > 0.0005 ||
        Math.abs(y.v) > 0.0005 ||
        Math.abs(light.target - light.p) > 0.002;
      if (moving) {
        raf = requestAnimationFrame(frame);
      } else {
        x.p = x.target;
        y.p = y.target;
        light.p = light.target;
        write();
        raf = 0;
      }
    };

    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const aim = (nx, ny, on = true) => {
      x.target = clamp(nx, -1, 1);
      y.target = clamp(ny, -1, 1);
      light.target = on ? 1 : 0;
      slowUntil = 0;
      if (reduced) {
        x.p = x.target;
        y.p = y.target;
        light.p = light.target;
        write();
      } else wake();
    };

    const aimAt = event => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      aim(((event.clientX - rect.left) / rect.width) * 2 - 1, ((event.clientY - rect.top) / rect.height) * 2 - 1);
    };

    const release = () => aim(0, 0, false);

    const onEnter = event => {
      if (event.pointerType === 'mouse') aimAt(event);
    };
    const onMove = event => {
      if (event.pointerType === 'mouse' || event.pointerId === touchId) aimAt(event);
    };
    const onLeave = event => {
      if (event.pointerType === 'mouse') release();
    };
    const onDown = event => {
      if (event.pointerType === 'mouse') return;
      touchId = event.pointerId;
      aimAt(event);
    };
    const onUp = event => {
      if (event.pointerId !== touchId) return;
      touchId = null;
      release();
    };

    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);

    const resize = () => {
      size.width = root.offsetWidth;
      size.height = root.offsetHeight;
      write();
    };
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    observer?.observe(root);
    const onMotionChange = () => {
      reduced = motionQuery?.matches ?? false;
      if (reduced) {
        cancelAnimationFrame(raf);
        raf = 0;
        x.p = x.target = x.v = 0;
        y.p = y.target = y.v = 0;
        light.p = light.target = 0;
      }
      write();
    };
    motionQuery?.addEventListener?.('change', onMotionChange);

    engineRef.current = { aim, release, write };

    if (settingsRef.current.intro && !reduced) {
      x.p = 0.62;
      y.p = -0.55;
      light.p = 1;
      slowUntil = performance.now() + 1400;
      write();
      wake();
    } else {
      write();
    }

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      motionQuery?.removeEventListener?.('change', onMotionChange);
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.write();
  }, [enableTilt, tiltStrength, parallax]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enableMobileTilt || !enableTilt || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let listening = false;
    let disposed = false;
    const onOrientation = event => {
      if (event.beta == null || event.gamma == null || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const sensitivity = settingsRef.current.mobileTiltSensitivity;
      engineRef.current?.aim((event.gamma * sensitivity) / 150, ((event.beta - 20) * sensitivity) / 150);
    };
    const listen = () => {
      if (listening || disposed) return;
      listening = true;
      window.addEventListener('deviceorientation', onOrientation);
    };
    const onClick = () => {
      const Motion = window.DeviceOrientationEvent;
      if (Motion && typeof Motion.requestPermission === 'function') {
        Motion.requestPermission()
          .then(state => {
            if (state === 'granted') listen();
          })
          .catch(() => {});
      } else {
        listen();
      }
    };

    root.addEventListener('click', onClick);
    return () => {
      disposed = true;
      root.removeEventListener('click', onClick);
      window.removeEventListener('deviceorientation', onOrientation);
    };
  }, [enableMobileTilt, enableTilt]);

  const palette = theme === 'light' ? 'light' : 'dark';
  const foil = backdropColor ? ((isDark(backdropColor) ?? palette === 'dark') ? 'dark' : 'light') : palette;
  const backdrop = backdropColor
    ? `linear-gradient(180deg, color-mix(in srgb, ${backdropColor}, #ffffff 12%) 0%, color-mix(in srgb, ${backdropColor}, #000000 18%) 100%)`
    : 'var(--pc-tile)';

  return (
    <div
      ref={rootRef}
      className={`profile-card ${className}`.trim()}
      style={{
        ...THEMES[palette],
        ...FOILS[foil],
        '--pc-radius': `${Math.max(0, radius)}px`,
        '--pc-backdrop': innerGradient ?? backdrop,
        '--pc-behind-glow-color': behindGlowColor,
        '--pc-behind-glow-size': behindGlowSize,
        '--pc-holo': clamp(holo, 0, 1),
        '--pc-glare': clamp(glare, 0, 1),
        '--pc-parallax': `${Math.max(0, parallax)}px`,
        '--pc-status': statusColor,
        '--pc-grain': grainUrl ? `url("${grainUrl}")` : GRAIN,
        '--pc-pattern': iconUrl ? `url("${iconUrl}")` : 'linear-gradient(#000, #000)',
        '--pc-pattern-size': iconUrl ? '180% auto' : '100% 100%',
        '--pc-holo-gain': iconUrl ? 1.25 : 0.75,
        '--pc-holo-detail': iconUrl && foil === 'dark' ? 1 : 0
      }}
    >
      {behindGlowEnabled && <span className="profile-card__behind" aria-hidden="true" />}
      <div className="profile-card__body">
        <div className="profile-card__tile">
          <span className="profile-card__sheen" aria-hidden="true" />
          <span className="profile-card__holo" aria-hidden="true">
            <span className="profile-card__holo-glow" />
            <span className="profile-card__holo-shift" />
          </span>
          {avatarUrl && (
            <img className="profile-card__photo" src={avatarUrl} alt={name || ''} loading="lazy" draggable={false} />
          )}
          {(name || title) && (
            <>
              <span className="profile-card__scrim" aria-hidden="true" />
              <div className="profile-card__info">
                {name && <h3 className="profile-card__name">{name}</h3>}
                {title && <p className="profile-card__title">{title}</p>}
              </div>
            </>
          )}
          <span className="profile-card__tile-rim" aria-hidden="true" />
        </div>

        {showUserInfo && (
          <div className="profile-card__footer">
            {miniAvatarUrl && (
              <span className="profile-card__avatar">
                <img src={miniAvatarUrl} alt="" loading="lazy" draggable={false} />
              </span>
            )}
            <div className="profile-card__meta">
              {handle && <span className="profile-card__handle">@{handle}</span>}
              {status && <span className="profile-card__status">{status}</span>}
            </div>
            {contactText && (
              <button
                type="button"
                className="profile-card__contact"
                onClick={onContactClick}
                aria-label={name ? `${contactText} ${name}` : contactText}
              >
                {contactText}
              </button>
            )}
          </div>
        )}

        <span className="profile-card__glare" aria-hidden="true" />
        <span className="profile-card__shade" aria-hidden="true" />
        <span className="profile-card__rim" aria-hidden="true" />
      </div>
    </div>
  );
};

export default memo(ProfileCard);
