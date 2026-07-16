// Shared category taxonomy for the Newsroom.
// `slug` is what's stored in articles.category; the human label comes from i18n
// (`categories.<slug>`), and `color` drives the accent dot/pill in the UI.
export const CATEGORIES = [
  { slug: 'general', color: '#6b7280' },
  { slug: 'world', color: '#2563eb' },
  { slug: 'politics', color: '#b91c1c' },
  { slug: 'economics', color: '#0e9f6e' },
  { slug: 'urban', color: '#0ea5e9' },
  { slug: 'projects', color: '#3b82f6' },
  { slug: 'legal', color: '#8b5cf6' },
  { slug: 'social', color: '#ec4899' },
  { slug: 'research', color: '#f59e0b' },
  { slug: 'events', color: '#ef4444' },
  { slug: 'traffic', color: '#f97316' },
  { slug: 'health', color: '#14b8a6' },
  { slug: 'technology', color: '#6366f1' },
  { slug: 'sport', color: '#22c55e' },
  { slug: 'travel', color: '#06b6d4' },
  { slug: 'entertainment', color: '#a855f7' },
]

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug)
export const DEFAULT_CATEGORY = 'general'

const BY_SLUG = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]))

export const isCategory = (slug) => Boolean(slug) && slug in BY_SLUG
export const categoryColor = (slug) => BY_SLUG[slug]?.color || '#6b7280'
