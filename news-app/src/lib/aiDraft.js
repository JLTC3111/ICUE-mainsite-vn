const STORAGE_KEY = 'icue:ai-draft:v1'

export function saveAiDraft(draft) {
  if (!draft?.title || !draft?.content_html) return
  const payload = {
    title: String(draft.title),
    subtitle: draft.subtitle != null ? String(draft.subtitle) : '',
    content_html: String(draft.content_html),
    language: draft.language || undefined,
    category: draft.category || undefined,
    savedAt: Date.now(),
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* private mode */
  }
  return payload
}

export function consumeAiDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(STORAGE_KEY)
    const parsed = JSON.parse(raw)
    if (!parsed?.title || !parsed?.content_html) return null
    return parsed
  } catch {
    return null
  }
}
