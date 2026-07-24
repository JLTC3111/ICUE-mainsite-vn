import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useNewsroomTheme } from '../context/NewsroomThemeContext'
import { fetchMyArticles } from '../lib/articles'
import { askGeminiAssist } from '../lib/geminiAssist'
import { generateFluxImage } from '../lib/fluxAssist'
import { saveAiDraft } from '../lib/aiDraft'
import { translateTextsViaApi } from '../lib/translate'
import {
  listAssistThreads,
  fetchAssistThread,
  persistAssistExchange,
  deleteAssistThread,
} from '../lib/assistHistory'
import { useArticleTitleTranslations } from '../hooks/useArticleTitleTranslations'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import TranslationLineSkeleton from '../components/TranslationSkeleton'
import TranslateElapsedPill from '../components/TranslateElapsedPill'
import PhosphorCpu from '../components/icons/PhosphorCpu'
import TextAnimate from '../components/magicui/TextAnimate'
import { AnimatedShinyText } from '../components/magicui/AnimatedShinyText'
import { TextLoop } from '../components/motion-primitives/TextLoop'
import { Ripple } from '../components/magicui/Ripple'
import './AiAssist.css'

const MODES = [
  { id: 'chat', labelKey: 'aiAssist.modeChat', icon: 'ask' },
  { id: 'review', labelKey: 'aiAssist.modeReview', icon: 'review' },
  { id: 'improve', labelKey: 'aiAssist.modeImprove', icon: 'improve' },
  { id: 'draft', labelKey: 'aiAssist.modeDraft', icon: 'draft' },
]

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function Icon({ name, className = '' }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: `agent-icon${className ? ` ${className}` : ''}`,
    'aria-hidden': true,
  }

  switch (name) {
    case 'spark':
      return (
        <svg {...common}>
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
          <circle cx="12" cy="12" r="3.2" />
        </svg>
      )
    case 'articles':
      return (
        <svg {...common}>
          <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
          <path d="M9 9h6M9 13h6" />
        </svg>
      )
    case 'history':
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    case 'ask':
      return (
        <svg {...common}>
          <path d="M8 10a4 4 0 1 1 7.5 2c-.7.8-1.5 1.4-1.5 3" />
          <path d="M12 18h.01" />
        </svg>
      )
    case 'review':
      return (
        <svg {...common}>
          <path d="M9 5H5v14h14v-4" />
          <path d="M16 3h5v5" />
          <path d="M10 14 21 3" />
        </svg>
      )
    case 'improve':
      return (
        <svg {...common}>
          <path d="m5 16 4-4 3 3 7-7" />
          <path d="M15 8h4v4" />
        </svg>
      )
    case 'draft':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      )
    case 'outline':
      return (
        <svg {...common}>
          <path d="M8 6h13M8 12h13M8 18h13" />
          <path d="M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      )
    case 'headline':
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h10M4 18h14" />
          <path d="M4 6v12" />
        </svg>
      )
    case 'editor':
      return (
        <svg {...common}>
          <path d="M4 20h16" />
          <path d="M7 16V8a2 2 0 0 1 2-2h2" />
          <path d="M14 4h4v4" />
          <path d="m18 4-7 7" />
        </svg>
      )
    case 'image':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="10" r="1.5" />
          <path d="m21 15-4.5-4.5L9 18" />
        </svg>
      )
    case 'send':
      return (
        <svg {...common}>
          <path d="M5 12h12" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      )
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </svg>
      )
    case 'bot':
      return (
        <svg {...common}>
          <rect x="5" y="8" width="14" height="11" rx="3" />
          <path d="M12 5v3M9 13h.01M15 13h.01" />
        </svg>
      )
    case 'trash':
      return (
        <svg {...common}>
          <path d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12" />
        </svg>
      )
    case 'panel':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16" />
        </svg>
      )
    default:
      return null
  }
}

function formatReply(text) {
  const escaped = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br />')
}

function dayPeriod(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

function greetingList(raw) {
  return Array.isArray(raw) ? raw.map(String).filter(Boolean) : []
}

function shortTitle(title, max = 28) {
  const s = String(title || '')
  return s.length > max ? `${s.slice(0, max)}…` : s
}

/** Prefer character slide for short replies; words for long ones to avoid DOM blowups. */
function replyAnimateBy(text) {
  return String(text || '').length > 420 ? 'word' : 'character'
}

async function localizeAssistPayload(result, uiLang, draftReadyFallback) {
  const reply = String(result?.reply || '').trim() || (result?.draft ? draftReadyFallback : '')
  const draft = result?.draft || null
  const toTranslate = [reply]
  if (draft?.title) toTranslate.push(String(draft.title))
  if (draft?.subtitle) toTranslate.push(String(draft.subtitle))

  try {
    const translated = await translateTextsViaApi(toTranslate, uiLang)
    const texts = translated?.texts || toTranslate
    let cursor = 0
    const nextReply = texts[cursor++] ?? reply
    const nextDraft = draft
      ? {
          ...draft,
          title: draft.title ? (texts[cursor++] ?? draft.title) : draft.title,
          subtitle: draft.subtitle ? (texts[cursor++] ?? draft.subtitle) : draft.subtitle,
          language: uiLang,
        }
      : null
    return { reply: nextReply, draft: nextDraft }
  } catch {
    return { reply, draft }
  }
}

export default function AiAssist() {
  const { t, i18n } = useTranslation()
  useDocumentTitle(t('aiAssist.title'))
  const { user } = useAuth()
  const { isDark } = useNewsroomTheme()
  const navigate = useNavigate()
  const uiLang = i18n.resolvedLanguage || i18n.language || 'vi'

  const [articles, setArticles] = useState([])
  const [articlesState, setArticlesState] = useState('loading')
  const [selectedIds, setSelectedIds] = useState([])
  const [mode, setMode] = useState('chat')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [localizing, setLocalizing] = useState(false)
  const [error, setError] = useState('')
  const [articlesOpen, setArticlesOpen] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(true)
  const [threadId, setThreadId] = useState(null)
  const [threads, setThreads] = useState([])
  const [historyState, setHistoryState] = useState('loading')

  const listRef = useRef(null)
  const inputRef = useRef(null)
  const {
    titles: translatedTitles,
    isTitlePending,
    pending: titlesPending,
  } = useArticleTitleTranslations(articles, uiLang)

  const translateActive = titlesPending || localizing

  const refreshThreads = useCallback(async () => {
    if (!user) return
    setHistoryState('loading')
    try {
      const result = await listAssistThreads()
      if (result.unavailable) {
        setThreads([])
        setHistoryState('unavailable')
        return
      }
      setThreads(result.threads || [])
      setHistoryState('ready')
    } catch {
      setHistoryState('error')
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    setArticlesState('loading')
    fetchMyArticles(user.id)
      .then((rows) => {
        setArticles(rows)
        setArticlesState('ready')
      })
      .catch(() => setArticlesState('error'))
    refreshThreads()
  }, [user, refreshThreads])

  useEffect(() => {
    setMessages([])
    setError('')
    setLocalizing(false)
    setThreadId(null)
  }, [uiLang])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, busy, localizing, imageBusy])

  const selectedArticles = useMemo(
    () => articles.filter((a) => selectedIds.includes(a.id)),
    [articles, selectedIds],
  )

  const suggestions = useMemo(() => {
    const hasArticle = selectedArticles.length > 0
    return [
      {
        icon: hasArticle ? 'review' : 'outline',
        text: hasArticle ? t('aiAssist.suggestReview') : t('aiAssist.suggestOutline'),
      },
      {
        icon: hasArticle ? 'improve' : 'draft',
        text: hasArticle ? t('aiAssist.suggestImprove') : t('aiAssist.suggestDraft'),
      },
      {
        icon: 'headline',
        text: t('aiAssist.suggestHeadline'),
      },
    ]
  }, [selectedArticles.length, t])

  const emptyGreetings = useMemo(() => {
    const period = dayPeriod()
    const list = greetingList(t(`aiAssist.emptyGreetings.${period}`, { returnObjects: true }))
    if (list.length) return list
    return greetingList(t('aiAssist.emptyGreetings.afternoon', { returnObjects: true }))
  }, [t, uiLang])

  const toggleArticle = useCallback((id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 5) return prev
      return [...prev, id]
    })
  }, [])

  const openDraftInEditor = useCallback((draft) => {
    const saved = saveAiDraft(draft)
    if (!saved) return
    navigate('/write', { state: { aiDraft: saved } })
  }, [navigate])

  const send = useCallback(async (rawText) => {
    const text = String(rawText || '').trim()
    if (!text || busy || localizing) return

    if ((mode === 'review' || mode === 'improve') && selectedIds.length === 0) {
      setError(t('aiAssist.needArticle'))
      return
    }

    setError('')
    const userMsg = { id: uid(), role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setBusy(true)

    try {
      const history = nextMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        content: m.content,
      }))
      const result = await askGeminiAssist({
        mode,
        messages: history,
        articleIds: selectedIds,
        language: uiLang,
      })

      setBusy(false)
      setLocalizing(true)
      const localized = await localizeAssistPayload(
        result,
        uiLang,
        t('aiAssist.draftReady'),
      )

      const assistantMsg = {
        id: uid(),
        role: 'assistant',
        content: localized.reply || '',
        draft: localized.draft || null,
        attached: result.attached || [],
      }

      setMessages((prev) => [...prev, assistantMsg])

      try {
        const saved = await persistAssistExchange({
          threadId,
          userId: user.id,
          mode,
          language: uiLang,
          articleIds: selectedIds,
          messages: nextMessages,
          userMessage: userMsg,
          assistantMessage: assistantMsg,
        })
        if (saved.threadId && saved.threadId !== threadId) {
          setThreadId(saved.threadId)
        }
        if (!saved.unavailable) refreshThreads()
        else if (historyState !== 'unavailable') setHistoryState('unavailable')
      } catch {
        /* history persistence is best-effort */
      }
    } catch (err) {
      const code = err?.code || ''
      let msg = t('aiAssist.errorGeneric')
      if (code === 'gemini_not_configured') msg = t('aiAssist.errorNotConfigured')
      else if (code === 'unauthorized') msg = t('aiAssist.errorAuth')
      else if (code === 'article_required') msg = t('aiAssist.needArticle')
      else if (code === 'rate_limited' || err?.status === 429) msg = t('aiAssist.errorRate')
      else if (err?.message) msg = err.message
      setError(msg)
    } finally {
      setBusy(false)
      setLocalizing(false)
      inputRef.current?.focus()
    }
  }, [busy, localizing, mode, selectedIds, messages, uiLang, t, threadId, user, refreshThreads, historyState])

  const generateImage = useCallback(async () => {
    const prompt = String(input || '').trim()
    if (!prompt) {
      setError(t('aiAssist.imagePromptRequired'))
      return
    }
    if (busy || localizing || imageBusy) return

    setError('')
    const userMsg = { id: uid(), role: 'user', content: prompt }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setImageBusy(true)

    try {
      const result = await generateFluxImage({ prompt, steps: 4 })
      const assistantMsg = {
        id: uid(),
        role: 'assistant',
        content: t('aiAssist.imageReady'),
        image: result.image || null,
        imagePrompt: result.prompt || prompt,
      }
      setMessages((prev) => [...prev, assistantMsg])

      try {
        const saved = await persistAssistExchange({
          threadId,
          userId: user.id,
          mode: 'chat',
          language: uiLang,
          articleIds: selectedIds,
          messages: [...messages, userMsg],
          userMessage: userMsg,
          assistantMessage: {
            ...assistantMsg,
            content: `${assistantMsg.content}\n\n${assistantMsg.imagePrompt || prompt}`,
          },
        })
        if (saved.threadId && saved.threadId !== threadId) {
          setThreadId(saved.threadId)
        }
        if (!saved.unavailable) refreshThreads()
        else if (historyState !== 'unavailable') setHistoryState('unavailable')
      } catch {
        /* history persistence is best-effort */
      }
    } catch (err) {
      const code = err?.code || ''
      let msg = t('aiAssist.errorImageGeneric')
      if (code === 'flux_not_configured') msg = t('aiAssist.errorFluxNotConfigured')
      else if (code === 'unauthorized') msg = t('aiAssist.errorAuth')
      else if (code === 'prompt_required') msg = t('aiAssist.imagePromptRequired')
      else if (code === 'rate_limited' || err?.status === 429) msg = t('aiAssist.errorImageRate')
      else if (err?.message) msg = err.message
      setError(msg)
    } finally {
      setImageBusy(false)
      inputRef.current?.focus()
    }
  }, [
    input, busy, localizing, imageBusy, t, threadId, user, uiLang,
    selectedIds, messages, refreshThreads, historyState,
  ])

  const startNewChat = useCallback(() => {
    setThreadId(null)
    setMessages([])
    setError('')
    setSelectedIds([])
  }, [])

  const openThread = useCallback(async (id) => {
    if (!id || busy || localizing) return
    setError('')
    try {
      const result = await fetchAssistThread(id)
      if (result.unavailable) {
        setHistoryState('unavailable')
        return
      }
      if (!result.thread) return
      setThreadId(result.thread.id)
      setMode(MODES.some((m) => m.id === result.thread.mode) ? result.thread.mode : 'chat')
      setSelectedIds(Array.isArray(result.thread.article_ids) ? result.thread.article_ids.filter(Boolean) : [])
      setMessages(result.messages || [])
      setHistoryOpen(true)
    } catch {
      setError(t('aiAssist.historyLoadError'))
    }
  }, [busy, localizing, t])

  const removeThread = useCallback(async (id, event) => {
    event?.stopPropagation?.()
    if (!id) return
    if (!window.confirm(t('aiAssist.historyDeleteConfirm'))) return
    try {
      const result = await deleteAssistThread(id)
      if (result.unavailable) {
        setHistoryState('unavailable')
        return
      }
      if (threadId === id) startNewChat()
      refreshThreads()
    } catch {
      setError(t('aiAssist.historyDeleteError'))
    }
  }, [t, threadId, startNewChat, refreshThreads])

  const onSubmit = useCallback((e) => {
    e.preventDefault()
    send(input)
  }, [send, input])

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }, [send, input])

  const skeletonOnDark = isDark ? 'translation-skeleton--on-dark' : ''

  const formatThreadTime = useCallback((iso) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleString(uiLang, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }, [uiLang])

  const layoutClass = [
    'agent',
    isDark ? '' : 'agent--light',
    articlesOpen ? '' : 'agent--articles-collapsed',
    historyOpen ? '' : 'agent--history-collapsed',
  ].filter(Boolean).join(' ')

  return (
    <div className={layoutClass}>
      <aside className="agent__rail agent__rail--articles" aria-label={t('aiAssist.context')}>
        <div className="agent__rail-head">
          <div className="agent__rail-title-row">
            <Icon name="articles" />
            <h1 className="agent__sidebar-title">{t('aiAssist.context')}</h1>
          </div>
          <button
            type="button"
            className="agent__icon-btn"
            onClick={() => setArticlesOpen(false)}
            aria-label={t('aiAssist.hideContext')}
          >
            ×
          </button>
        </div>

        <p className="agent__hint">{t('aiAssist.contextHint')}</p>

        {articlesState === 'loading' && (
          <div className="agent__sidebar-loading">
            <span className="spin" style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }} />
          </div>
        )}
        {articlesState === 'error' && <p className="agent__hint">{t('aiAssist.articlesError')}</p>}
        {articlesState === 'ready' && articles.length === 0 && (
          <p className="agent__hint">{t('aiAssist.noArticles')}</p>
        )}

        {articlesState === 'ready' && articles.length > 0 && (
          <ul className="agent__article-list">
            {articles.map((a) => {
              const on = selectedIds.includes(a.id)
              const pending = isTitlePending(a.id)
              const label = pending ? '' : (translatedTitles[a.id] || a.title || '')
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className={`agent__article${on ? ' is-on' : ''}`}
                    onClick={() => toggleArticle(a.id)}
                    aria-pressed={on}
                    aria-busy={pending || undefined}
                  >
                    <span className={`agent__dot agent__dot--${a.status}`} />
                    <span className="agent__article-body">
                      {pending ? (
                        <TranslationLineSkeleton
                          lines={2}
                          className={`${skeletonOnDark} agent__title-skeleton`.trim()}
                        />
                      ) : (
                        <span className="agent__article-title translation-reveal">{label}</span>
                      )}
                      <span className="agent__article-meta">
                        {a.status === 'published' ? t('common.published') : t('common.draft')}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      <section className="agent__main">
        <Ripple className="agent__main-ripple" mainCircleSize={180} mainCircleOpacity={0.22} numCircles={7} />
        <header className="agent__top">
          <div className="agent__top-left">
            {!articlesOpen && (
              <button
                type="button"
                className="agent__ghost-btn"
                onClick={() => setArticlesOpen(true)}
              >
                <Icon name="panel" />
                {t('aiAssist.showContext')}
              </button>
            )}
            <div className="agent__brand-block">
              <span className="agent__brand-mark" aria-hidden>
                <Icon name="editor" />
              </span>
              <div>
                <p className="agent__eyebrow">{t('aiAssist.sidebar')}</p>
                <h2 className="agent__title">{t('aiAssist.eyebrow')}</h2>
              </div>
            </div>
          </div>
          <div className="agent__top-actions">
            <TranslateElapsedPill active={translateActive} />
            {selectedArticles.length > 0 && (
              <div className="agent__chips" aria-label={t('aiAssist.attached')}>
                {selectedArticles.map((a) => {
                  const pending = isTitlePending(a.id)
                  const label = pending ? '' : (translatedTitles[a.id] || a.title || '')
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`agent__chip${pending ? ' is-pending' : ''}`}
                      onClick={() => toggleArticle(a.id)}
                      title={t('aiAssist.removeArticle')}
                      aria-busy={pending || undefined}
                    >
                      {pending ? (
                        <TranslationLineSkeleton
                          lines={1}
                          className={`${skeletonOnDark} agent__chip-skeleton`.trim()}
                        />
                      ) : (
                        <span className="translation-reveal">@{shortTitle(label)}</span>
                      )}
                      <span aria-hidden="true">×</span>
                    </button>
                  )
                })}
              </div>
            )}
            {!historyOpen && (
              <button
                type="button"
                className="agent__ghost-btn"
                onClick={() => setHistoryOpen(true)}
              >
                <Icon name="history" />
                {t('aiAssist.showHistory')}
              </button>
            )}
            <button
              type="button"
              className="agent__solid-btn"
              onClick={generateImage}
              disabled={busy || localizing || imageBusy}
            >
              <Icon name="image" />
              {imageBusy ? t('aiAssist.generatingImage') : t('aiAssist.generateImage')}
            </button>
          </div>
        </header>

        <div className="agent__modes" role="tablist" aria-label={t('aiAssist.modes')}>
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              className={`agent__mode${mode === m.id ? ' is-on' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <Icon name={m.icon} />
              {t(m.labelKey)}
            </button>
          ))}
        </div>

        <div className="agent__transcript" ref={listRef}>
          {messages.length === 0 && !busy && !localizing && !imageBusy && (
            <div className="agent__empty">
              <span className="agent__empty-mark" aria-hidden>
                <PhosphorCpu className="agent__empty-icon" />
              </span>
              <h3 className="agent__empty-title">
                {emptyGreetings.length > 1 ? (
                  <TextLoop className="agent__empty-loop" interval={3}>
                    {emptyGreetings.map((greeting) => (
                      <AnimatedShinyText
                        key={greeting}
                        className="agent__empty-shiny"
                        shimmerWidth={120}
                      >
                        {greeting}
                      </AnimatedShinyText>
                    ))}
                  </TextLoop>
                ) : (
                  <AnimatedShinyText className="agent__empty-shiny" shimmerWidth={120}>
                    {emptyGreetings[0] || t('aiAssist.emptyBody')}
                  </AnimatedShinyText>
                )}
              </h3>
              <p>{t('aiAssist.emptyBody')}</p>
              <div className="agent__suggestions">
                {suggestions.map((s) => (
                  <button
                    key={s.text}
                    type="button"
                    className="agent__suggestion"
                    onClick={() => send(s.text)}
                  >
                    <Icon name={s.icon} />
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <article key={m.id} className={`agent__msg agent__msg--${m.role}`}>
              <div className="agent__msg-role">
                <Icon name={m.role === 'user' ? 'user' : 'bot'} />
                {m.role === 'user' ? t('aiAssist.you') : t('aiAssist.agent')}
              </div>
              {m.role === 'assistant' ? (
                <TextAnimate
                  as="div"
                  className="agent__msg-body agent__msg-body--animate"
                  animation="slideLeft"
                  by={replyAnimateBy(m.content)}
                  duration={0.55}
                  startOnView={false}
                  once
                >
                  {String(m.content || '')}
                </TextAnimate>
              ) : (
                <div
                  className="agent__msg-body"
                  dangerouslySetInnerHTML={{ __html: `<p>${formatReply(m.content)}</p>` }}
                />
              )}
              {m.image && (
                <figure className="agent__image-card">
                  <img src={m.image} alt={m.imagePrompt || t('aiAssist.imageReady')} />
                  {m.imagePrompt ? (
                    <figcaption>{m.imagePrompt}</figcaption>
                  ) : null}
                </figure>
              )}
              {m.draft && (
                <div className="agent__draft-card">
                  <div className="agent__draft-meta">
                    <span className="agent__draft-label">{t('aiAssist.draftReady')}</span>
                    <strong>{m.draft.title}</strong>
                    {m.draft.subtitle ? <span>{m.draft.subtitle}</span> : null}
                  </div>
                  <button
                    type="button"
                    className="agent__solid-btn agent__solid-btn--sm"
                    onClick={() => openDraftInEditor(m.draft)}
                  >
                    <Icon name="draft" />
                    {t('aiAssist.openInEditor')}
                  </button>
                </div>
              )}
            </article>
          ))}

          {(busy || localizing || imageBusy) && (
            <div className="agent__msg agent__msg--assistant agent__msg--thinking">
              <div className="agent__msg-role" aria-live="polite">
                <Icon name="bot" />
                {localizing ? (
                  t('translate.translating')
                ) : imageBusy ? (
                  t('aiAssist.generatingImage')
                ) : (
                  <AnimatedShinyText className="agent__thinking-shiny" shimmerWidth={80}>
                    {t('aiAssist.thinking')}
                  </AnimatedShinyText>
                )}
              </div>
              {localizing ? (
                <div className="agent__msg-translating" aria-busy="true">
                  <TranslationLineSkeleton
                    lines={5}
                    className={`${skeletonOnDark} agent__reply-skeleton`.trim()}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>

        {error && <p className="agent__error" role="alert">{error}</p>}

        <form className="agent__composer" onSubmit={onSubmit}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={3}
            placeholder={t(`aiAssist.placeholder.${mode}`)}
            disabled={busy || localizing || imageBusy}
          />
          <div className="agent__composer-bar">
            <span className="agent__composer-hint">{t('aiAssist.enterHint')}</span>
            <button
              type="submit"
              className="agent__solid-btn"
              disabled={busy || localizing || imageBusy || !input.trim()}
            >
              <Icon name="send" />
              {busy ? t('aiAssist.thinking') : localizing ? t('translate.translating') : t('aiAssist.send')}
            </button>
          </div>
        </form>
      </section>

      <aside className="agent__rail agent__rail--history" aria-label={t('aiAssist.history')}>
        <div className="agent__rail-head">
          <div className="agent__rail-title-row">
            <Icon name="history" />
            <h2 className="agent__sidebar-title">{t('aiAssist.history')}</h2>
          </div>
          <button
            type="button"
            className="agent__icon-btn"
            onClick={() => setHistoryOpen(false)}
            aria-label={t('aiAssist.hideHistory')}
          >
            ×
          </button>
        </div>

        <div className="agent__history">
          {historyState === 'loading' && (
            <div className="agent__sidebar-loading">
              <span className="spin" style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }} />
            </div>
          )}
          {historyState === 'unavailable' && (
            <p className="agent__hint">{t('aiAssist.historyUnavailable')}</p>
          )}
          {historyState === 'error' && (
            <p className="agent__hint">{t('aiAssist.historyError')}</p>
          )}
          {historyState === 'ready' && threads.length === 0 && (
            <p className="agent__hint">{t('aiAssist.historyEmpty')}</p>
          )}
          {historyState === 'ready' && threads.length > 0 && (
            <ul className="agent__history-list">
              {threads.map((thread) => {
                const on = thread.id === threadId
                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      className={`agent__history-item${on ? ' is-on' : ''}`}
                      onClick={() => openThread(thread.id)}
                    >
                      <span className="agent__history-title">{thread.title || t('aiAssist.newChat')}</span>
                      <span className="agent__history-meta">{formatThreadTime(thread.updated_at)}</span>
                    </button>
                    <button
                      type="button"
                      className="agent__history-delete"
                      onClick={(e) => removeThread(thread.id, e)}
                      aria-label={t('common.delete')}
                      title={t('common.delete')}
                    >
                      <Icon name="trash" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}
