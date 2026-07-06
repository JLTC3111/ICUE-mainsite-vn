export default function VideoToggle({
  id,
  inputId,
  variant = 'nav',
  label = 'Bật/tắt video nền',
  showLabel = true,
  visible = true,
}) {
  if (!visible) return null;

  const variantClass =
    variant === 'navbar' ? 'home-video-toggle--navbar' : 'home-video-toggle--nav';

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
