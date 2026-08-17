import AnimatedViewToggle from '@icue/ui/AnimatedViewToggle';

/** Phosphor `sun` — from public/phosphor-icons/sun.svg */
function SunIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z" />
    </svg>
  );
}

/** Phosphor `moon` — from public/phosphor-icons/moon.svg */
function MoonIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z" />
    </svg>
  );
}

/**
 * The About page's light/dark switch, in the slot the background-video switch
 * used to occupy.
 *
 * It reuses `home-video-toggle`'s wrapper classes on purpose: those rules are
 * what place a control in the pill header and in the mobile navbar, and this
 * control wants exactly the same placement. `--theme` is there for anything
 * that needs to tell the two apart, not because the geometry differs.
 *
 * `checked` means dark. The icon shows the theme you are in, matching the
 * camera toggle next door, which shows a camera while the video is playing.
 */
export default function ThemeToggle({
  id,
  variant = 'nav',
  label = 'Chuyển giao diện sáng/tối',
  visible = true,
  checked = false,
  onCheckedChange,
  disabled = false,
}) {
  if (!visible) return null;

  const variantClass =
    variant === 'navbar' ? 'home-video-toggle--navbar' : 'home-video-toggle--nav';

  return (
    <div
      className={`home-video-toggle ${variantClass} home-video-toggle--animated home-video-toggle--theme`}
      id={id}
      aria-label={label}
    >
      <AnimatedViewToggle
        className="home-video-toggle__animated"
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        ariaLabel={label}
        duration={450}
        variant="circle"
        viewTransitionName="icue-avt-theme-icon"
        onIcon={<MoonIcon />}
        offIcon={<SunIcon />}
      />
    </div>
  );
}
