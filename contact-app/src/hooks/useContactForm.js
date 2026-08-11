import { useCallback, useMemo, useRef, useState } from 'react'
import { DEFAULT_TOPIC, deskForTopic } from '../data/contactChannels'
import { submitToNetlify } from '../lib/netlifyForm'

const EMPTY = {
  topic: DEFAULT_TOPIC,
  name: '',
  org: '',
  email: '',
  phone: '',
  location: '',
  message: '',
  consent: false,
}

/* Deliberately permissive. The address is checked by whether a reply arrives,
   not by a regular expression, and every stricter pattern in the wild rejects
   somebody's real address. This catches the typo — a missing @ or domain. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** The four fields the page asks for, in the order they appear. */
export const REQUIRED_FIELDS = ['name', 'email', 'message', 'consent']

export function useContactForm() {
  const [values, setValues] = useState(EMPTY)
  const [touched, setTouched] = useState({})
  const [attempted, setAttempted] = useState(false)
  const [status, setStatus] = useState('idle')
  const [sentDesk, setSentDesk] = useState(null)

  const fieldRefs = useRef({})
  const refSetters = useRef({})

  /* Cached per field name so the ref callback keeps its identity across
     renders — a fresh function each time would make React detach and reattach
     every input on every keystroke. */
  const registerField = useCallback((name) => {
    if (!refSetters.current[name]) {
      refSetters.current[name] = (element) => {
        fieldRefs.current[name] = element
      }
    }
    return refSetters.current[name]
  }, [])

  const missing = useMemo(
    () =>
      REQUIRED_FIELDS.filter((field) => {
        if (field === 'consent') return !values.consent
        if (field === 'email') return !EMAIL_PATTERN.test(values.email.trim())
        return !values[field].trim()
      }),
    [values],
  )

  const setField = useCallback((name, value) => {
    setValues((current) => ({ ...current, [name]: value }))
    // Re-editing a field the reader has already been told off about should
    // clear the complaint as soon as it is fixed, not on the next blur.
    setStatus((current) => (current === 'error' ? 'idle' : current))
  }, [])

  const blurField = useCallback((name) => {
    setTouched((current) => ({ ...current, [name]: true }))
  }, [])

  /* Errors stay quiet until the reader has either left the field or pressed
     send. Flagging an empty required field the moment the form renders is
     just nagging. */
  const errorFor = useCallback(
    (name) => ((attempted || touched[name]) && missing.includes(name) ? name : null),
    [attempted, missing, touched],
  )

  const desk = deskForTopic(values.topic)

  const submit = useCallback(
    async (language) => {
      setAttempted(true)

      if (missing.length > 0) {
        const target = fieldRefs.current[missing[0]]
        target?.focus?.()
        target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
        return
      }

      setStatus('sending')
      try {
        await submitToNetlify({
          'bot-field': '',
          topic: values.topic,
          name: values.name.trim(),
          org: values.org.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          location: values.location.trim(),
          message: values.message.trim(),
          consent: 'yes',
          language,
        })
        setSentDesk(deskForTopic(values.topic).id)
        setStatus('sent')
      } catch {
        // Values are kept on purpose: the failure panel offers to hand them to
        // a mail client, which only works if they are still here.
        setStatus('error')
      }
    },
    [missing, values],
  )

  const reset = useCallback(() => {
    setValues(EMPTY)
    setTouched({})
    setAttempted(false)
    setSentDesk(null)
    setStatus('idle')
  }, [])

  return {
    values,
    setField,
    blurField,
    errorFor,
    missing,
    desk,
    sentDesk,
    status,
    submit,
    reset,
    registerField,
  }
}
