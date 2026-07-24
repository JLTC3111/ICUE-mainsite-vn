import { supabase } from './supabase'

function threadTitleFromMessages(messages) {
  const firstUser = (messages || []).find((m) => m.role === 'user')
  const text = String(firstUser?.content || '').trim().replace(/\s+/g, ' ')
  if (!text) return 'New chat'
  return text.length > 64 ? `${text.slice(0, 64)}…` : text
}

function isMissingRelation(error) {
  const code = error?.code || ''
  const msg = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  return (
    code === '42P01'
    || code === 'PGRST205'
    || msg.includes('assist_threads')
    || msg.includes('assist_messages')
    || msg.includes('does not exist')
    || msg.includes('schema cache')
  )
}

/** List recent AI Assist threads for the signed-in user. */
export async function listAssistThreads({ limit = 40 } = {}) {
  const { data, error } = await supabase
    .from('assist_threads')
    .select('id, title, mode, language, article_ids, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (isMissingRelation(error)) return { threads: [], unavailable: true }
    throw error
  }
  return { threads: data || [], unavailable: false }
}

/** Load one thread + messages. */
export async function fetchAssistThread(threadId) {
  const { data: thread, error: threadError } = await supabase
    .from('assist_threads')
    .select('id, title, mode, language, article_ids, created_at, updated_at')
    .eq('id', threadId)
    .maybeSingle()

  if (threadError) {
    if (isMissingRelation(threadError)) return { thread: null, messages: [], unavailable: true }
    throw threadError
  }
  if (!thread) return { thread: null, messages: [], unavailable: false }

  const { data: messages, error: msgError } = await supabase
    .from('assist_messages')
    .select('id, role, content, draft, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (msgError) throw msgError

  return {
    thread,
    messages: (messages || []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content || '',
      draft: m.draft || null,
    })),
    unavailable: false,
  }
}

/**
 * Create or update a thread after a successful exchange.
 * Pass existing threadId to append; omit to start a new thread.
 */
export async function persistAssistExchange({
  threadId,
  userId,
  mode,
  language,
  articleIds = [],
  messages = [],
  userMessage,
  assistantMessage,
}) {
  if (!userId || !userMessage?.content || !assistantMessage?.content) {
    return { threadId: threadId || null, unavailable: false }
  }

  let activeId = threadId || null

  if (!activeId) {
    const title = threadTitleFromMessages([...messages, userMessage])
    const { data, error } = await supabase
      .from('assist_threads')
      .insert({
        user_id: userId,
        title,
        mode: mode || 'chat',
        language: language || 'vi',
        article_ids: articleIds || [],
      })
      .select('id')
      .single()

    if (error) {
      if (isMissingRelation(error)) return { threadId: null, unavailable: true }
      throw error
    }
    activeId = data.id
  } else {
    await supabase
      .from('assist_threads')
      .update({
        mode: mode || 'chat',
        language: language || 'vi',
        article_ids: articleIds || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeId)
  }

  const rows = [
    {
      thread_id: activeId,
      role: 'user',
      content: String(userMessage.content),
      draft: null,
    },
    {
      thread_id: activeId,
      role: 'assistant',
      content: String(assistantMessage.content),
      draft: assistantMessage.draft || null,
    },
  ]

  const { error: insertError } = await supabase.from('assist_messages').insert(rows)
  if (insertError) {
    if (isMissingRelation(insertError)) return { threadId: activeId, unavailable: true }
    throw insertError
  }

  // Refresh title from first user message if still default
  if (threadId) {
    const title = threadTitleFromMessages([...messages, userMessage])
    await supabase
      .from('assist_threads')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', activeId)
  }

  return { threadId: activeId, unavailable: false }
}

export async function deleteAssistThread(threadId) {
  const { error } = await supabase.from('assist_threads').delete().eq('id', threadId)
  if (error) {
    if (isMissingRelation(error)) return { unavailable: true }
    throw error
  }
  return { unavailable: false }
}

export async function createBlankAssistThread({ userId, mode, language }) {
  const { data, error } = await supabase
    .from('assist_threads')
    .insert({
      user_id: userId,
      title: 'New chat',
      mode: mode || 'chat',
      language: language || 'vi',
      article_ids: [],
    })
    .select('id, title, mode, language, article_ids, created_at, updated_at')
    .single()

  if (error) {
    if (isMissingRelation(error)) return { thread: null, unavailable: true }
    throw error
  }
  return { thread: data, unavailable: false }
}
