import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import GooeyNav from '../../../shared/ui/GooeyNav.jsx'

export default function GooeyTabs({ documents, activeSlug, iconMap, ariaLabel, labelFor }) {
  const items = useMemo(() => documents.map(document => {
    const Icon = iconMap[document.icon]
    return {
      label: labelFor(document),
      href: '/' + document.slug,
      icon: Icon ? <Icon aria-hidden="true" /> : null,
    }
  }), [documents, iconMap, labelFor])
  const index = documents.findIndex(document => document.slug === activeSlug)
  return (
    <GooeyNav
      className="gooey-tabs"
      items={items}
      activeIndex={index}
      linkComponent={Link}
      ariaLabel={ariaLabel}
      color={documents[index]?.accent || '#93c5fd'}
      particleCount={10}
      frame={false}
      style={{ '--gn-muted': 'rgba(255,255,255,.78)', '--gn-ink': '#ffffff' }}
    />
  )
}
