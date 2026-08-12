import { useState } from 'react'
import { Link } from 'react-router-dom'

const PARTICLE_POSITIONS = [
  [-34, -18],
  [-12, -29],
  [15, -27],
  [36, -12],
  [33, 17],
  [11, 29],
  [-17, 26],
  [-36, 9],
]

/**
 * Route-aware adaptation of ReactBits' Gooey Nav. Links stay ordinary,
 * crawlable navigation while the active pill and short particle burst provide
 * the same visual feedback without taking over keyboard behavior.
 */
export default function GooeyTabs({
  documents,
  activeSlug,
  iconMap,
  ariaLabel,
  labelFor,
}) {
  const [burst, setBurst] = useState({ slug: '', key: 0 })

  return (
    <nav className="gooey-tabs" aria-label={ariaLabel}>
      <ul>
        {documents.map((document) => {
          const Icon = iconMap[document.icon]
          const active = document.slug === activeSlug
          const bursting = burst.slug === document.slug

          return (
            <li key={document.slug}>
              <Link
                to={`/${document.slug}`}
                className={active ? 'is-active' : ''}
                aria-current={active ? 'page' : undefined}
                style={{
                  '--tab-accent': document.accent,
                  '--tab-accent-soft': document.accentSoft,
                }}
                onClick={() => {
                  if (!active) {
                    setBurst({ slug: document.slug, key: burst.key + 1 })
                  }
                }}
              >
                <Icon aria-hidden="true" />
                <span>{labelFor(document)}</span>
                {bursting && (
                  <span
                    key={burst.key}
                    className="gooey-tabs__particles"
                    aria-hidden="true"
                    onAnimationEnd={() => setBurst({ slug: '', key: burst.key })}
                  >
                    {PARTICLE_POSITIONS.map(([x, y], index) => (
                      <i
                        key={`${x}-${y}`}
                        style={{
                          '--particle-x': `${x}px`,
                          '--particle-y': `${y}px`,
                          '--particle-delay': `${index * 16}ms`,
                        }}
                      />
                    ))}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
