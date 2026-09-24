import fs from 'node:fs'
import path from 'node:path'

function inside(root, target) {
  return target === root || target.startsWith(root + path.sep)
}

/** Resolve a URL beneath a public build directory, including symlink checks. */
export function resolveStaticPath(directory, relativeUrl) {
  let relative
  try {
    relative = decodeURIComponent(relativeUrl)
  } catch {
    return null
  }
  if (path.isAbsolute(relative) || /[\\\u0000-\u001f\u007f]/u.test(relative)) return null
  // Reject dot segments before normalization, and never serve hidden files.
  if (relative.split('/').some((part) => part.startsWith('.') && part !== '.well-known')) return null

  const root = path.resolve(directory)
  const target = path.resolve(root, relative)
  if (!inside(root, target)) return null

  try {
    if (!fs.existsSync(root)) return target
    // Missing assets can still have an existing symlink parent. Validate the
    // nearest existing ancestor as well as files that exist already.
    let ancestor = target
    while (!fs.existsSync(ancestor)) {
      if (ancestor === root) return target
      ancestor = path.dirname(ancestor)
    }
    return inside(fs.realpathSync(root), fs.realpathSync(ancestor)) ? target : null
  } catch {
    return null
  }
}

export function denyStaticPath(res) {
  res.statusCode = 403
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end('Forbidden')
}
