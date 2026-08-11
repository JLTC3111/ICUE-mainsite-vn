import { useTranslation } from 'react-i18next'
import { TOPICS } from '../data/contactChannels'
import { composeMailto } from '../lib/netlifyForm'
import { useContactForm } from '../hooks/useContactForm'
import './ContactForm.css'

/** The • that marks the four fields we actually need. */
function Required() {
  const { t } = useTranslation()
  return (
    <>
      <span className="ct-req" aria-hidden="true">
        •
      </span>
      <span className="ct-visually-hidden">{` (${t('form.requiredAria')})`}</span>
    </>
  )
}

function Field({ name, type = 'text', required = false, rows, form }) {
  const { t } = useTranslation()
  const error = form.errorFor(name)
  const errorId = `ct-${name}-error`
  const Tag = rows ? 'textarea' : 'input'

  return (
    <div className={`ct-field${rows ? ' ct-field--tall' : ''}`}>
      <label className="ct-field__label" htmlFor={`ct-${name}`}>
        {t(`form.fields.${name}.label`)}
        {required && <Required />}
      </label>
      <Tag
        id={`ct-${name}`}
        ref={form.registerField(name)}
        className={`ct-field__input${error ? ' has-error' : ''}`}
        name={name}
        type={rows ? undefined : type}
        rows={rows}
        value={form.values[name]}
        placeholder={t(`form.fields.${name}.placeholder`)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => form.setField(name, event.target.value)}
        onBlur={() => form.blurField(name)}
      />
      {error && (
        <p className="ct-field__error" id={errorId}>
          {t(`form.errors.${name}`)}
        </p>
      )}
    </div>
  )
}

export default function ContactForm() {
  const { t, i18n } = useTranslation()
  const form = useContactForm()
  const lang = i18n.resolvedLanguage || i18n.language

  const ready = form.missing.length === 0
  const sending = form.status === 'sending'

  // The mockup's static "Still needs a name, an email, …" line, computed. It
  // names what is actually outstanding, so it stays useful as the form fills
  // and turns into the routing note once nothing is.
  const hint = ready
    ? t('form.hintReady', { desk: t(`desks.${form.desk.id}.title`) })
    : t('form.hintMissing', {
        list: form.missing.map((key) => t(`form.missing.${key}`)).join(', '),
      })

  if (form.status === 'sent') {
    return (
      <section className="ct-write" id="write" aria-labelledby="ct-write-title">
        <div className="ct-sent" role="status">
          <h2 className="ct-sent__title" id="ct-write-title">
            {t('form.success.title')}
          </h2>
          <p className="ct-sent__body">
            {t('form.success.body', { desk: t(`desks.${form.sentDesk}.title`) })}
          </p>
          <button type="button" className="ct-textbutton" onClick={form.reset}>
            {t('form.success.again')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="ct-write" id="write" aria-labelledby="ct-write-title">
      <h2 className="ct-write__title" id="ct-write-title">
        {t('form.title')}
      </h2>
      <p className="ct-write__lead">{t('form.lead')}</p>

      {/* Netlify is told about this form by the static copy in index.html; it
          never parses what React renders. See src/lib/netlifyForm.js. */}
      <form
        className="ct-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          form.submit(lang)
        }}
      >
        <fieldset className="ct-topics">
          <legend className="ct-eyebrow ct-topics__legend">
            {t('form.topicLabel')}
            <Required />
          </legend>
          <div className="ct-topics__row">
            {TOPICS.map((topic) => {
              const active = form.values.topic === topic.id
              return (
                <label
                  key={topic.id}
                  className={`ct-topic${active ? ' is-active' : ''}`}
                  htmlFor={`ct-topic-${topic.id}`}
                >
                  <input
                    id={`ct-topic-${topic.id}`}
                    className="ct-visually-hidden"
                    type="radio"
                    name="topic"
                    value={topic.id}
                    checked={active}
                    onChange={() => form.setField('topic', topic.id)}
                  />
                  {t(`form.topics.${topic.id}`)}
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="ct-form__pair">
          <Field name="name" required form={form} />
          <Field name="org" form={form} />
        </div>

        <div className="ct-form__pair">
          <Field name="email" type="email" required form={form} />
          <Field name="phone" type="tel" form={form} />
        </div>

        <Field name="location" form={form} />
        <Field name="message" rows={5} required form={form} />

        <div className={`ct-consent${form.errorFor('consent') ? ' has-error' : ''}`}>
          <input
            id="ct-consent"
            ref={form.registerField('consent')}
            type="checkbox"
            name="consent"
            checked={form.values.consent}
            aria-required="true"
            aria-invalid={form.errorFor('consent') ? true : undefined}
            aria-describedby={form.errorFor('consent') ? 'ct-consent-error' : undefined}
            onChange={(event) => form.setField('consent', event.target.checked)}
            onBlur={() => form.blurField('consent')}
          />
          <label htmlFor="ct-consent">
            {t('form.consent')}
            <Required />
          </label>
          {form.errorFor('consent') && (
            <p className="ct-field__error" id="ct-consent-error">
              {t('form.errors.consent')}
            </p>
          )}
        </div>

        <div className="ct-send">
          {/* Never `disabled`: a dead button explains nothing. Until the four
              fields are there it is quiet rather than inert, and pressing it
              shows the errors and jumps to the first thing missing. */}
          <button
            type="submit"
            className={`ct-send__button${ready ? ' is-ready' : ''}`}
            aria-describedby="ct-send-hint"
          >
            {sending ? t('form.submitting') : t('form.submit')}
          </button>
          <p className="ct-send__hint" id="ct-send-hint" aria-live="polite">
            {hint}
          </p>
        </div>

        {form.status === 'error' && (
          <div className="ct-failure" role="alert">
            <p className="ct-failure__title">{t('form.failure.title')}</p>
            <p className="ct-failure__body">{t('form.failure.body')}</p>
            <p className="ct-failure__actions">
              <a
                className="ct-textlink"
                href={composeMailto({
                  to: form.desk.email,
                  subject: `[${t(`form.topics.${form.values.topic}`)}] ${form.values.name}`,
                  fields: [
                    ['name', form.values.name],
                    ['org', form.values.org],
                    ['email', form.values.email],
                    ['phone', form.values.phone],
                    ['location', form.values.location],
                    ['message', form.values.message],
                  ],
                  labels: {
                    name: t('form.fields.name.label'),
                    org: t('form.fields.org.label'),
                    email: t('form.fields.email.label'),
                    phone: t('form.fields.phone.label'),
                    location: t('form.fields.location.label'),
                    message: t('form.fields.message.label'),
                  },
                })}
              >
                {t('form.failure.mail')}
              </a>
              <button type="submit" className="ct-textbutton">
                {t('form.failure.retry')}
              </button>
            </p>
          </div>
        )}
      </form>
    </section>
  )
}
