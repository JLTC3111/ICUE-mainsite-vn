/**
 * Renders one of the inline SVGs from src/data/icons.js.
 *
 * The markup is authored and lives in this repository — see the note there —
 * so injecting it is safe. It is always decorative: every glyph on this page
 * sits beside its own visible label.
 */
export default function Glyph({ markup, className }) {
  if (!markup) return null
  return (
    <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: markup }} />
  )
}
