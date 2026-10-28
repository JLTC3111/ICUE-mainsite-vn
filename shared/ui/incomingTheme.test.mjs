import test from 'node:test'
import assert from 'node:assert/strict'

let sequence = 0
async function receiver(search, { blocked = false } = {}) {
  const values = new Map([['icue_home_theme', 'dark'], ['aboutUs_theme', 'dark'], ['icue-newsroom-theme', 'dark'], ['icue-ourwork-theme', 'dark']])
  const location = new URL(`https://vi.icue.vn/newsroom/?lang=fr${search}`)
  globalThis.window = { location, localStorage: { setItem(key, value) { if (blocked) throw new Error('Blocked'); values.set(key, value) } }, history: { state: { retained: true }, replaceState(state, _, url) { Object.assign(this, {state}); window.location = new URL(url) } } }
  globalThis.localStorage = window.localStorage
  const module = await import(`./incomingTheme.js?case=${sequence++}`)
  return { module, values }
}

test('an explicit light preference replaces the destination’s old dark choices', async () => {
  const { module, values } = await receiver('&theme=light')
  assert.equal(module.readIncomingTheme(), 'light')
  assert([...values.values()].every(value => value === 'light'))
  module.rememberThemePreference('dark')
  assert.equal(window.location.searchParams.get('theme'), 'dark')
  assert.equal(window.location.searchParams.get('lang'), 'fr')
  assert.equal(module.readIncomingTheme(), 'dark')
})
test('an explicit dark preference is available even when storage is blocked', async () => {
  const { module } = await receiver('&theme=dark', { blocked: true })
  assert.equal(module.readIncomingTheme(), 'dark')
  module.rememberThemePreference('light')
  assert.equal(module.readIncomingTheme(), 'light')
})
test('missing or invalid theme values do not change existing preferences', async () => {
  for (const search of ['', '&theme=invalid']) {
    const { module, values } = await receiver(search)
    assert.equal(module.readIncomingTheme(), null)
    assert([...values.values()].every(value => value === 'dark'))
  }
})
