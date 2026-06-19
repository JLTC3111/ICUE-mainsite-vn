import { supabase } from './supabase'

// Visitor engagement (no login). Hearts + comments are keyed server-side to a
// hash of the visitor's IP via SECURITY DEFINER RPCs — see supabase/schema.sql.

export async function getHearts(articleId) {
  const { data, error } = await supabase.rpc('get_hearts', { p_article: articleId })
  if (error) throw error
  return { liked: !!data?.liked, count: data?.count ?? 0 }
}

export async function toggleHeart(articleId) {
  const { data, error } = await supabase.rpc('toggle_heart', { p_article: articleId })
  if (error) throw error
  return { liked: !!data?.liked, count: data?.count ?? 0 }
}

export async function fetchComments(articleId) {
  const { data, error } = await supabase
    .from('article_comments')
    .select('id, author_name, body, created_at')
    .eq('article_id', articleId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function addComment(articleId, body, name) {
  const { data, error } = await supabase.rpc('add_comment', {
    p_article: articleId,
    p_body: body,
    p_name: name || null,
  })
  if (error) throw error
  return data
}
