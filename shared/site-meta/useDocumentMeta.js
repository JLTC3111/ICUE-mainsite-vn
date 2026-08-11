import { useEffect } from 'react'

/**
 * Keeps <title> and <meta name="description"> in sync with the active route
 * and the active UI language.
 *
 * Every app in this repo ships a static Vietnamese <head> in its index.html.
 * That head is only ever correct for the language the visitor happened to
 * start in and for the route the server actually served — once React Router
 * takes over, nothing touches the DOM head again. So a reader who switches to
 * Korean, or who navigates from an article back to the grid, keeps whatever
 * the shell shipped unless something re-writes it. That something is this hook.
 *
 * Pass strings that have already been through `t()`; this hook owns the DOM
 * writes only, never the translation lookup. Re-running it when the language
 * changes is the caller's job too — in practice that happens for free, since
 * `t()` returns a new string and these are plain effect dependencies.
 *
 * A falsy `title` falls back to `fallbackTitle` instead of leaving the previous
 * route's title in place: pages that have no title of their own (or that are
 * still loading one) must still clear the last one.
 */
export function useDocumentMeta({ title, description, fallbackTitle } = {}) {
  useEffect(() => {
    const resolvedTitle = title || fallbackTitle
    if (resolvedTitle) document.title = resolvedTitle

    if (description) {
      const tag = document.querySelector('meta[name="description"]')
      if (tag) tag.setAttribute('content', description)
    }
  }, [title, description, fallbackTitle])
}

export default useDocumentMeta
