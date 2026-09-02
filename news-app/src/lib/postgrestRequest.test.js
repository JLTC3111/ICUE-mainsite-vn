import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPostgrestUrl, cleanPostgrestSelect } from './postgrestRequest.js'

const MULTILINE_SELECT = `
  id, slug, title,
  author:profiles!articles_author_id_fkey (
    id, display_name
  )
`

test('removes formatting whitespace from a multiline PostgREST select', () => {
  assert.equal(
    cleanPostgrestSelect(MULTILINE_SELECT),
    'id,slug,title,author:profiles!articles_author_id_fkey(id,display_name)',
  )
})

test('preserves whitespace inside quoted identifiers', () => {
  assert.equal(
    cleanPostgrestSelect('id, "display name", profile ( "full name" )'),
    'id,"display name",profile("full name")',
  )
})

test('builds a select URL without encoded line breaks', () => {
  const url = buildPostgrestUrl('https://example.supabase.co', 'articles', {
    select: MULTILINE_SELECT,
    status: 'eq.published',
    limit: 120,
  })

  assert.equal(url.searchParams.get('select'),
    'id,slug,title,author:profiles!articles_author_id_fkey(id,display_name)')
  assert.equal(url.searchParams.get('status'), 'eq.published')
  assert.equal(url.searchParams.get('limit'), '120')
  assert.equal(url.href.includes('%0A'), false)
})
