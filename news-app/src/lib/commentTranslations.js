// Hand-authored comment translations, stored in public.comment_translations and
// served as-is — the same model as article translations (see translate.js).
// Nothing here calls a translation API. On-the-fly machine translation is a
// separate, on-device concern handled by browserTranslator.js and is never
// written back to the database.

import { supabase } from './supabase'
import { normalizeLang } from './translateUtils.js'

/**
 * Hand-authored translations for a set of comments in one query.
 * Returns `{ [commentId]: body }` for the requested locale.
 */
export async function fetchCommentTranslations(commentIds, targetLocale) {
  const target = normalizeLang(targetLocale)
  const ids = [...new Set((commentIds || []).map(String).filter(Boolean))]
  if (!target || !ids.length) return {}

  const { data, error } = await supabase
    .from('comment_translations')
    .select('comment_id, body')
    .eq('locale', target)
    .in('comment_id', ids)

  if (error) throw error

  const out = {}
  for (const row of data || []) {
    if (row.body) out[row.comment_id] = row.body
  }
  return out
}

export async function saveCommentTranslation(commentId, locale, body) {
  const target = normalizeLang(locale)
  const text = String(body || '').trim()
  if (!commentId || !target) throw new Error('invalid_request')
  if (!text) throw new Error('empty_translation')

  const { error } = await supabase
    .from('comment_translations')
    .upsert({
      comment_id: commentId,
      locale: target,
      provider: 'manual',
      body: text,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'comment_id,locale' })

  if (error) throw error
}

export async function deleteCommentTranslation(commentId, locale) {
  const target = normalizeLang(locale)
  if (!commentId || !target) throw new Error('invalid_request')

  const { error } = await supabase
    .from('comment_translations')
    .delete()
    .eq('comment_id', commentId)
    .eq('locale', target)

  if (error) throw error
}
