import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  React, act, create, deferred, platform, silenceRenderer, sourceModule, unmount,
} from '../../shared/resilience/testHarness.js'

const translations = Object.fromEntries(['vi', 'en', 'de', 'fr', 'ja', 'ko'].map(language => [
  language, JSON.parse(readFileSync(new URL(`../../news-app/src/locales/${language}.json`, import.meta.url))),
]))

async function login(t, { recovery = false, reset = async () => ({ error: null }), from, signIn = async () => ({ error: { message: 'Invalid login' } }) } = {}) {
  silenceRenderer(t)
  const f = platform()
  let language = 'vi'
  const navigations = []
  const { default: Login } = await sourceModule('news-app/src/pages/Login.jsx', {
    globals: f,
    imports: {
      'react-router-dom': { useNavigate: () => (...args) => navigations.push(args), useLocation: () => ({ state: { from } }) },
      'react-i18next': { useTranslation: () => ({ t: key => translations[language].login[key.split('.')[1]] || key, i18n: { resolvedLanguage: language } }) },
      'lucide-react': { Eye: () => null, EyeOff: () => null },
      '../context/AuthContext': { useAuth: () => ({ signIn }) },
      '../lib/supabase': { supabase: { auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        resetPasswordForEmail: async () => { throw new Error('Unexpected duplicate request') },
        updateUser: async () => ({ error: null }),
      } } },
      '../lib/authRedirect': {
        getAuthRedirectUrl: () => 'https://vi.icue.vn/newsroom/login', isPasswordRecoveryUrl: () => recovery,
        clearPasswordRecoveryUrl() {},
      },
      '../lib/authReset': { authErrorKey: () => 'login.resetError', sendPasswordResetEmail: reset },
      '../hooks/useDocumentTitle': { useDocumentTitle() {} },
      '../components/LanguageSwitcher': { default: () => null },
    },
  })
  let renderer
  await act(async () => { renderer = create(React.createElement(Login)) })
  t.after(() => unmount(renderer))
  const message = () => renderer.root.findAllByType('p').find(p => p.props.className?.includes('login__msg'))?.props.children
  return {
    renderer, navigations,
    message,
    async input(id, value) {
      await act(async () => renderer.root.findByProps({ id }).props.onChange({ target: { value } }))
    },
    async reset() {
      await act(async () => renderer.root.findByProps({ className: 'login__forgot' }).props.onClick())
    },
    async submit() {
      await act(async () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }))
    },
    async checkLanguages(key) {
      for (const nextLanguage of ['vi', 'en', 'de', 'fr', 'ja', 'ko', 'vi']) {
        language = nextLanguage
        await act(async () => renderer.update(React.createElement(Login)))
        assert.equal(message(), translations[language].login[key], `message should update to ${language}`)
      }
    },
    async changeLanguage(nextLanguage) {
      language = nextLanguage
      await act(async () => renderer.update(React.createElement(Login)))
    },
  }
}

test('staff entry identifies the support portal and returns to chat management after sign-in', async t => {
  const form = await login(t, { from: '/support', signIn: async () => ({ error: null }) })
  await form.changeLanguage('en')
  assert.equal(form.renderer.root.findByType('h1').props.children, 'Staff sign-in')
  assert.equal(form.renderer.root.findByProps({ className: 'login__pill' }).props.children, 'Staff')
  await form.input('email', 'staff@example.invalid')
  await form.input('password', 'example-staff-password')
  await form.submit()
  assert.equal(form.navigations.at(-1)[0], '/support')
  assert.equal(form.navigations.at(-1)[1].replace, true)
})

test('the missing-email warning changes language while visible', async t => {
  const form = await login(t)
  await form.reset()
  await form.checkLanguages('resetNeedEmail')
})

test('sign-in errors change language while visible', async t => {
  const form = await login(t)
  await form.input('email', 'editor@example.invalid')
  await form.input('password', 'incorrect')
  await form.submit()
  await form.checkLanguages('error')
})

test('password-reset failures change language while visible', async t => {
  const form = await login(t, { reset: async () => ({ error: { code: 'config_missing' } }) })
  await form.input('email', 'editor@example.invalid')
  await form.reset()
  await form.checkLanguages('resetError')
})

test('a reset response uses the current language even when it changed during the request', async t => {
  const pending = deferred()
  const form = await login(t, { reset: () => pending.promise })
  await form.input('email', 'editor@example.invalid')
  let request
  // Start the request without waiting for the response.
  await act(async () => { request = form.reset() })
  await form.changeLanguage('en')
  await act(async () => { pending.resolve({ error: null }); await request })
  assert.equal(form.message(), translations.en.login.resetSent)
  await form.checkLanguages('resetSent')
})

test('new-password validation and success messages change language while visible', async t => {
  const form = await login(t, { recovery: true })
  await form.submit()
  await form.checkLanguages('resetTooShort')
  await form.input('new-password', 'a-new-test-password')
  await form.input('confirm-password', 'does-not-match')
  await form.submit()
  await form.checkLanguages('resetMismatch')
  await form.input('confirm-password', 'a-new-test-password')
  await form.submit()
  await form.checkLanguages('resetSuccess')
})
