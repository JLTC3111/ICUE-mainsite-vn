/**
 * Netlify Forms, submitted over fetch instead of a native POST so the page can
 * keep the reader's words on screen and show its own confirmation.
 *
 * Two things have to line up for this to be accepted:
 *   1. `form-name` must match a form Netlify found while parsing the deployed
 *      HTML — that declaration is the hidden <form name="contact"> in
 *      index.html, and it must list every field name sent here.
 *   2. The body must be url-encoded, not JSON. Netlify's form endpoint reads
 *      form encodings only; JSON is accepted with a 200 and then dropped.
 *
 * The POST goes to the site root rather than /contact/. Netlify routes by the
 * `form-name` field, not by path, and "/" is the one target that is never
 * shadowed by a rewrite rule.
 */
export const FORM_NAME = 'contact'

const POST_TARGET = '/'

export async function submitToNetlify(fields) {
  const body = new URLSearchParams({ 'form-name': FORM_NAME, ...fields })

  const response = await fetch(POST_TARGET, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(`Netlify form POST failed with ${response.status}`)
  }
}

/**
 * Fallback for when the POST cannot go through — a dead network, an ad blocker
 * eating the request, or a preview build with no form backend. Everything the
 * reader typed is folded into a mailto: so the message survives the failure.
 */
export function composeMailto({ to, subject, fields, labels }) {
  const lines = fields
    .filter(([, value]) => value)
    .map(([key, value]) => `${labels[key] || key}: ${value}`)

  // encodeURIComponent, not URLSearchParams: a mailto query is percent-encoded
  // like any URI component, and the form encoding URLSearchParams applies turns
  // every space into a literal `+` in the reader's draft.
  return (
    `mailto:${to}`
    + `?subject=${encodeURIComponent(subject)}`
    + `&body=${encodeURIComponent(lines.join('\n'))}`
  )
}
