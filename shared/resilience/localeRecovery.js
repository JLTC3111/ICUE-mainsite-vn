import { subscribeToPageResume } from './pageResume.js'
import { withDeadline } from './requests.js'

/** Failed i18next backend entries are terminal. Retry the actual chunk loader. */
export function installLocaleRecovery(i18n, loaders, normalize = (value) => value) {
  let pending = false
  let active = true
  const unsubscribe = subscribeToPageResume(() => {
    const selected = i18n.language
    const language = selected?.split('-')[0]
    const load = loaders?.[language]
    if (pending || !load || i18n.hasResourceBundle(language, 'translation')) return
    pending = true
    withDeadline(load).then(async (module) => {
      if (!active) return
      i18n.addResourceBundle(language, 'translation', normalize(module.default), true, true)
      // React-i18next listens to languageChanged; keep a newer user choice intact.
      if (i18n.language === selected) await i18n.changeLanguage(selected)
    }).catch(() => {}).finally(() => { pending = false })
  }, { minHiddenMs: 0 })
  return () => { active = false; unsubscribe() }
}
