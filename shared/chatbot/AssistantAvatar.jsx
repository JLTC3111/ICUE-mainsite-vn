import { GLYPH_PATHS } from './mascot/expressions.js'
import './AssistantAvatar.css'

/** Each message keeps a static face; only the pending row uses the thinking face. */
export default function AssistantAvatar({ state = 'idle' }) {
  const expression = ['greeting', 'happy'].includes(state) ? 'happy'
    : ['confused', 'error'].includes(state) ? 'confused'
      : ['thinking', 'sleeping'].includes(state) ? 'thinking' : 'idle'
  const glyph = expression === 'happy' ? 'caret' : expression === 'thinking' ? 'dash' : 'prompt'
  const y = expression === 'happy' ? 11 : expression === 'thinking' ? 13 : 9

  return (
    <svg className="icue-chat__assistant-avatar" data-expression={expression} width="28" height="28" viewBox="0 0 30 30" aria-hidden="true" focusable="false">
      <rect className="icue-chat__assistant-avatar-visor" x="1" y="3" width="28" height="24" rx="4.5" />
      <g className="icue-chat__assistant-avatar-glyphs" fill="currentColor" shapeRendering="crispEdges">
        <path d={GLYPH_PATHS[glyph]} transform={`translate(5.5 ${y}) scale(1.4)`} />
        <path
          d={GLYPH_PATHS[expression === 'idle' ? 'dash' : glyph]}
          transform={expression === 'confused' ? 'translate(24.5 9) scale(-1.4 1.4)' : `translate(17.5 ${expression === 'idle' ? 17 : y}) scale(1.4)`}
        />
      </g>
    </svg>
  )
}
