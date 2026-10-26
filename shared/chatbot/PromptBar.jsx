import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Paperclip, ArrowUp, Square, X, FileText, Image, RotateCcw } from 'lucide-react'
import './chatTheme.css'
import './PromptBar.css'

/** The Prompt Bar's compact composer, adapted for a human support conversation. */
export default function PromptBar({ value, onChange, attachments = [], onRemove, onRetry, onAttach, onSend, onStop, busy = false, disabled = false, readOnly = false, placeholder, labels, inputRef, background, color, menuBackground, sparkColor, width = '100%', radius = 16, maxRows = 5 }) {
 const localRef = useRef(null), ref = inputRef || localRef, fileRef = useRef(null), rootRef = useRef(null), menuRef = useRef(null), attachRef = useRef(null)
 const [menu, setMenu] = useState(false), [position, setPosition] = useState(null)
 const menuId = useId(), formatsId = useId(), focusMenu = useRef(false)
 const customStyle = { '--prompt-bg': background, '--prompt-ink': color, '--prompt-menu': menuBackground, '--prompt-accent': sparkColor }
 const canSend = !disabled && !busy && !attachments.some(file => file.status !== 'ready') && (value.trim() || attachments.length > 0)

 useLayoutEffect(() => {
  const input = ref.current
  if (!input) return
  input.style.height = 'auto'
  input.style.height = `${Math.min(input.scrollHeight, maxRows * 22)}px`
 }, [value, maxRows, ref])

 useLayoutEffect(() => {
  if (!menu) return undefined
  const place = () => {
   const rect = rootRef.current.getBoundingClientRect(), viewport = window.visualViewport
   const edge = 8, gap = 8, top = viewport?.offsetTop || 0, left = viewport?.offsetLeft || 0
   const viewWidth = viewport?.width || window.innerWidth, viewHeight = viewport?.height || window.innerHeight
   const above = rect.top - top - gap - edge, below = top + viewHeight - rect.bottom - gap - edge
   const height = menuRef.current.offsetHeight, upwards = above >= height || above >= below
   setPosition({ left: Math.max(left + edge, Math.min(rect.left, left + viewWidth - rect.width - edge)), width: Math.min(rect.width, viewWidth - edge * 2), top: upwards ? Math.max(top + edge, rect.top - gap - height) : rect.bottom + gap, maxHeight: Math.max(44, upwards ? above : below) })
  }
  const close = event => {
   if (event.key === 'Escape') {
    event.preventDefault(); event.stopPropagation(); setMenu(false); attachRef.current?.focus()
   } else if (event.type === 'pointerdown' && !rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setMenu(false)
  }
  const keyboard = event => {
   if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
    event.preventDefault(); menuRef.current?.querySelector('[role="menuitem"]')?.focus()
   } else if (event.key === 'Tab') setMenu(false)
  }
  place()
  if (focusMenu.current) { menuRef.current.querySelector('[role="menuitem"]')?.focus(); focusMenu.current = false }
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
  observer?.observe(rootRef.current); observer?.observe(menuRef.current)
  document.addEventListener('pointerdown', close); document.addEventListener('keydown', close, true)
  window.addEventListener('resize', place); window.addEventListener('scroll', place, true)
  window.visualViewport?.addEventListener('resize', place); window.visualViewport?.addEventListener('scroll', place)
  menuRef.current?.addEventListener('keydown', keyboard)
  const popup = menuRef.current
  return () => {
   observer?.disconnect()
   document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close, true)
   window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true)
   window.visualViewport?.removeEventListener('resize', place); window.visualViewport?.removeEventListener('scroll', place)
   popup?.removeEventListener('keydown', keyboard)
  }
 }, [menu])

 const send = () => { if (canSend) onSend(value, { attachments }) }
 // Keep the popup outside scrolling forms and clipped chat windows, while
 // inheriting the palette of the floating chat or embedded customer portal.
 const overlayRoot = menu ? rootRef.current?.closest?.('.icue-chat, .customer-portal') || (typeof document === 'undefined' ? null : document.body) : null
 return <div ref={rootRef} className="icue-prompt" data-menu-open={menu || undefined} style={{ ...customStyle, width, borderRadius: radius }}>
  {attachments.length > 0 && <div className="icue-prompt__attachments">{attachments.map(file => <div className="icue-prompt__file" key={file.client_id || file.id} data-state={file.status}>
   {file.mime?.startsWith('image/') || file.type?.startsWith('image/') ? <Image size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
   <span><strong>{file.name}</strong><small>{file.status === 'uploading' ? labels.uploading : file.status === 'failed' ? labels.uploadFailed : `${Math.ceil(file.size / 1024)} KB`}</small></span>
   {file.status === 'failed' && file.canRetry !== false && onRetry && <button type="button" disabled={readOnly} aria-label={`${labels.retry}: ${file.name}`} onClick={() => onRetry(file)}><RotateCcw size={13} aria-hidden="true" /></button>}
   <button type="button" disabled={readOnly} onClick={() => onRemove(file)} aria-label={`${labels.removeFile}: ${file.name}`}><X size={14} aria-hidden="true" /></button>
  </div>)}</div>}
  <textarea ref={ref} rows={1} maxLength={4000} value={value} disabled={disabled} readOnly={busy || readOnly} aria-label={placeholder} placeholder={placeholder}
   onChange={event => onChange(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send() } }} />
  <div className="icue-prompt__toolbar">
   <button ref={attachRef} type="button" className="icue-prompt__attach" aria-label={labels.attachFiles} title={labels.attachFiles} aria-expanded={menu} aria-controls={menu ? menuId : undefined} aria-haspopup="menu" disabled={busy || disabled || readOnly || attachments.length >= 5}
    onClick={() => { setPosition(null); setMenu(next => !next) }} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); focusMenu.current = true; setMenu(true); menuRef.current?.querySelector('[role="menuitem"]')?.focus() } }}><span><Plus size={19} strokeWidth={1.8} aria-hidden="true" /></span></button>
   <span className="icue-prompt__recipient">{labels.title}</span>
   <button type="button" className="icue-prompt__send" onClick={busy ? onStop : send} disabled={!busy && !canSend} aria-label={busy ? labels.stop : labels.send} title={busy ? labels.stop : labels.send}><span>{busy ? <Square size={12} fill="currentColor" aria-hidden="true" /> : <ArrowUp size={18} strokeWidth={2.5} aria-hidden="true" />}</span></button>
  </div>
  <input ref={fileRef} type="file" hidden multiple accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={event => { if (event.target.files?.length) onAttach([...event.target.files]); event.target.value = '' }} />
  {menu && overlayRoot && createPortal(<div ref={menuRef} id={menuId} className="icue-prompt-menu" role="menu" aria-label={labels.attachFiles} style={{ ...customStyle, ...position, visibility: position ? 'visible' : 'hidden' }}>
   <button type="button" role="menuitem" aria-describedby={formatsId} onClick={() => { setMenu(false); attachRef.current?.focus(); fileRef.current.click() }}><Paperclip size={18} strokeWidth={1.7} aria-hidden="true" /><span><strong>{labels.photosFiles}</strong><small>{labels.uploadDevice}</small></span></button>
   <p id={formatsId}>{labels.fileFormats}</p>
  </div>, overlayRoot)}
 </div>
}
