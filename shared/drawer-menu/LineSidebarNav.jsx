import { memo } from 'react'

const IndexNo = ({ n }) => (
  <span className="nav-drawer__index" aria-hidden="true">
    {String(n).padStart(2, '0')}
  </span>
)

function NavIcon({ icon: Icon }) {
  if (!Icon) return null
  return (
    <span className="nav-drawer__icon-wrap">
      <Icon />
    </span>
  )
}

function LineSidebarNav({
  links = [],
  people = null,
  navRef,
  onPointerMove,
  onPointerLeave,
  ariaLabel = 'Site',
}) {
  return (
    <nav
      className="nav-drawer__links"
      aria-label={ariaLabel}
      ref={navRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {links.map((link) => (
        <a
          key={link.key || link.href}
          href={link.href}
          className={link.isCurrent ? 'is-current' : undefined}
          aria-current={link.isCurrent ? 'page' : undefined}
          data-page={link.page}
          onClick={link.onClick}
        >
          <NavIcon icon={link.icon} />
          {link.index != null && <IndexNo n={link.index} />}
          <span className="nav-drawer__label">{link.label}</span>
        </a>
      ))}

      {people && (
        <>
          <button
            type="button"
            className={`nav-drawer__submenu-toggle ${people.open ? 'is-open' : ''}`}
            aria-expanded={people.open}
            onClick={people.onToggle}
          >
            <NavIcon icon={people.icon} />
            {people.index != null && <IndexNo n={people.index} />}
            <span className="nav-drawer__label-group">
              <span className="nav-drawer__label">{people.label}</span>
              <svg
                className="nav-drawer__chevron"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </span>
          </button>

          <div className={`nav-drawer__submenu ${people.open ? 'is-open' : ''}`}>
            <div className="nav-drawer__submenu-inner">
              {people.items.map((item) => (
                <a
                  key={item.key || item.href}
                  href={item.href}
                  className={[item.className, item.isCurrent ? 'is-current' : ''].filter(Boolean).join(' ') || undefined}
                  aria-current={item.isCurrent ? 'page' : undefined}
                  data-page={item.page}
                  onClick={item.onClick}
                >
                  <NavIcon icon={item.icon} />
                  <span className="nav-drawer__label">{item.label}</span>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </nav>
  )
}

export default memo(LineSidebarNav)
