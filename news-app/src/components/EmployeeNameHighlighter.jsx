import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Highlighter, MAGIC_UNDERLINE_COLOR } from '@/registry/magicui/highlighter'
import { useMainSite } from '../hooks/useMainSite'
import { findArticleDirectoryMentions } from '../lib/authorLinks'
import './AuthorLink.css'
import './EmployeeNameHighlighter.css'

const SKIP_MENTION_SELECTOR = [
  'a',
  'button',
  'code',
  'pre',
  'script',
  'style',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[data-directory-link]',
].join(',')

function collectMentionMounts(container) {
  if (!container) return []

  const textNodes = []
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT
        if (node.parentElement?.closest(SKIP_MENTION_SELECTOR)) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    },
  )

  while (walker.nextNode()) textNodes.push(walker.currentNode)

  const mounts = []
  for (const node of textNodes) {
    const text = String(node.nodeValue || '').normalize('NFC')
    const mentions = findArticleDirectoryMentions(text)
    if (!mentions.length) continue

    const fragment = document.createDocumentFragment()
    let cursor = 0

    for (const mention of mentions) {
      if (mention.start > cursor) {
        fragment.append(document.createTextNode(text.slice(cursor, mention.start)))
      }

      const mount = document.createElement('span')
      mount.dataset.directoryLink = mention.kind
      mount.className = 'article-directory-mention-mount'
      fragment.append(mount)
      mounts.push({ mount, mention })
      cursor = mention.end
    }

    if (cursor < text.length) {
      fragment.append(document.createTextNode(text.slice(cursor)))
    }

    node.replaceWith(fragment)
  }

  return mounts
}

function collectAnnotationTargets(container) {
  if (!container) return []

  return [...container.querySelectorAll('mark, u')].flatMap((target) => {
    if (target.tagName === 'U') {
      return [{ target, action: 'underline', color: MAGIC_UNDERLINE_COLOR }]
    }

    // Older content can contain nested <mark>/<u> pairs. Underline wins so a
    // phrase never receives both Magic UI treatments at the same time.
    if (target.closest('u') || target.querySelector('u')) return []

    return [{
      target,
      action: 'highlight',
      color: target.getAttribute('data-color')
        || target.style.backgroundColor
        || '#bbf7d0',
    }]
  })
}

function EmployeeMentionLink({ mention }) {
  const tooltipId = useId()
  const { peopleLink, structureLink, uiLang } = useMainSite()

  if (mention.kind === 'people') {
    return (
      <a
        className="article-directory-link article-directory-link--people"
        href={peopleLink('')}
        data-directory-link="people"
      >
        {mention.text}
      </a>
    )
  }

  const { employee } = mention
  const href = employee.structureProfileId
    ? structureLink(`profile/${encodeURIComponent(employee.structureProfileId)}`)
    : peopleLink(employee.peoplePath)
  const title = employee.title[uiLang] || employee.title.en || employee.title.vi || ''

  return (
    <span className="author-profile-trigger employee-profile-trigger">
      <a
        className="article-directory-link article-directory-link--employee"
        href={href}
        aria-describedby={tooltipId}
        data-directory-link="employee"
      >
        {mention.text}
      </a>
      <span
        id={tooltipId}
        className="author-profile-popover employee-profile-popover"
        role="tooltip"
      >
        <img
          className="author-profile-popover__photo"
          src={`${import.meta.env.BASE_URL}${employee.photo}`}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <span className="author-profile-popover__copy">
          <strong>{employee.name}</strong>
          <span>{title}</span>
          <small>ICUE</small>
        </span>
      </span>
    </span>
  )
}

/**
 * Render trusted article HTML, replace exact directory mentions with reusable
 * React links, and attach Magic UI to every persisted annotation. Neither
 * enhancement changes the HTML saved by TipTap.
 */
export default function EmployeeNameHighlighter({ html, className }) {
  const containerRef = useRef(null)
  const [mounts, setMounts] = useState([])
  const [annotationTargets, setAnnotationTargets] = useState([])
  // Keep this object referentially stable while enhancement state changes.
  // Otherwise React writes innerHTML again, removing the name mounts and
  // annotation targets before their React behavior can be attached.
  const innerHtml = useMemo(() => ({ __html: html || '' }), [html])

  useLayoutEffect(() => {
    const nextMounts = collectMentionMounts(containerRef.current)
    const nextAnnotationTargets = collectAnnotationTargets(containerRef.current)
    setMounts(nextMounts)
    setAnnotationTargets(nextAnnotationTargets)

    return () => {
      for (const { mount, mention } of nextMounts) {
        if (mount.parentNode) mount.replaceWith(document.createTextNode(mention.text))
      }
    }
  }, [html])

  return (
    <>
      <div
        ref={containerRef}
        className={className}
        dangerouslySetInnerHTML={innerHtml}
      />
      {mounts.map(({ mount, mention }, index) => createPortal(
        <EmployeeMentionLink mention={mention} />,
        mount,
        `${mention.kind}-${mention.employee?.id || mention.locale || 'people'}-${mention.start}-${index}`,
      ))}
      {annotationTargets.map(({ target, action, color }, index) => (
        <Highlighter
          key={`${action}-${color}-${index}`}
          target={target}
          targetClassName={`article-magic-${action}`}
          action={action}
          color={color}
          strokeWidth={action === 'underline' ? 2.25 : 1.5}
          animationDuration={420}
          iterations={2}
          padding={1}
        />
      ))}
    </>
  )
}
