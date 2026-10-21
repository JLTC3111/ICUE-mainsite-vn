import { useRef } from 'react';
import AnimatedViewToggle from '@icue/ui/AnimatedViewToggle';
import { useBackgroundContrastColor } from '../contact-sidebar/useMusicBarColor.js';

export default function VideoToggle({
  id,
  inputId,
  variant = 'nav',
  label = 'Bật/tắt video nền',
  showLabel = true,
  visible = true,
  animated = false,
  checked = false,
  onCheckedChange,
  disabled = false,
}) {
  const containerRef = useRef(null);
  const iconColor = useBackgroundContrastColor(
    containerRef,
    visible && animated,
    `${id}:${variant}:${checked}`,
  );
  if (!visible) return null;

  const variantClass =
    variant === 'navbar' ? 'home-video-toggle--navbar' : 'home-video-toggle--nav';

  if (animated) {
    return (
      <div
        ref={containerRef}
        className={`home-video-toggle ${variantClass} home-video-toggle--animated`}
        id={id}
        aria-label={label}
      >
        <AnimatedViewToggle
          className="home-video-toggle__animated"
          style={{ color: iconColor }}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          ariaLabel={label}
          duration={450}
          variant="circle"
        />
      </div>
    );
  }

  return (
    <div
      className={`home-video-toggle ${variantClass}`}
      id={id}
      aria-label={label}
    >
      <label className="home-video-toggle__label" htmlFor={inputId}>
        <input id={inputId} className="home-video-toggle__input" type="checkbox" />
        <span className="home-video-toggle__track" aria-hidden="true">
          <span className="home-video-toggle__thumb" aria-hidden="true" />
        </span>
        {showLabel && <span className="home-video-toggle__text">Video</span>}
      </label>
    </div>
  );
}
