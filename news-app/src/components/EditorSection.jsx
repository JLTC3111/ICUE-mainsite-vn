import { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import './EditorSection.css'

/**
 * A collapsible editor block with a one-line summary when closed.
 *
 * Meta and Cover start collapsed so the author lands near Title/Body instead of
 * scrolling past setup fields they rarely change. The closed state still has to
 * *answer* what's inside — hence the required `summary`, which shows the current
 * values as plain text (or swatches) rather than just a label.
 *
 * Uses the same mechanics as the References accordion: the whole header is a
 * real <button> (large hit target + free keyboard/ARIA), the panel stays mounted
 * so in-progress input is never lost, and `inert` keeps collapsed fields out of
 * the tab order without blocking the height transition.
 */
/*
 * Open state is controllable: pass `open`/`onOpenChange` so the outline rail can
 * expand a collapsed section before scrolling to it. Left uncontrolled, the
 * section manages itself as before.
 */
export default function EditorSection({
  label,
  summary,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  id,
  children,
}) {
  const [openState, setOpenState] = useState(defaultOpen)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : openState

  const toggle = () => {
    if (!isControlled) setOpenState((v) => !v)
    onOpenChange?.(!open)
  }

  const panelId = useId()
  const headerId = useId()

  return (
    <section id={id} className={`editor-section${open ? ' is-open' : ''}`}>
      <button
        type="button"
        id={headerId}
        className="editor-section__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <ChevronRight size={15} strokeWidth={2.5} className="editor-section__chevron" aria-hidden />
        <span className="editor-section__label">{label}</span>
        {/* Hidden when open: the fields themselves are the summary at that point,
            and keeping it would duplicate every value on screen. */}
        {!open && <span className="editor-section__summary">{summary}</span>}
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className="editor-section__panel"
        inert={!open}
      >
        <div className="editor-section__panel-inner">{children}</div>
      </div>
    </section>
  )
}
