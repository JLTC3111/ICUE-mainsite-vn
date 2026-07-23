import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DayPicker } from '@daypicker/react'
import { Calendar } from 'lucide-react'
import {
  formatDisplayDate,
  getDayPickerLocale,
  parseISODate,
  toISODate,
} from '../lib/dayPickerLocale'
import '@daypicker/react/style.css'
import './DateTimePicker.css'

/**
 * Locale-aware date field. Value is always YYYY-MM-DD (or '').
 */
export default function DatePickerField({
  value = '',
  onChange,
  id,
  className = '',
  allowClear = false,
  disabled = false,
  'aria-invalid': ariaInvalid,
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language
  const locale = getDayPickerLocale(lang)
  const autoId = useId()
  const fieldId = id || autoId
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)

  const selected = parseISODate(value)
  const label = formatDisplayDate(value, lang) || t('picker.placeholderDate')

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close()
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  const handleSelect = (date) => {
    onChange?.(date ? toISODate(date) : '')
    if (date) close()
  }

  const handleToday = () => {
    onChange?.(toISODate(new Date()))
    close()
  }

  const handleClear = () => {
    onChange?.('')
    close()
  }

  return (
    <div className={`dt-picker ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        id={fieldId}
        className="input dt-picker__trigger"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={ariaInvalid}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={value ? 'dt-picker__value' : 'dt-picker__placeholder'}>
          {label}
        </span>
        <Calendar size={16} aria-hidden="true" className="dt-picker__icon" />
      </button>

      {open && (
        <div
          className="dt-picker__popover"
          role="dialog"
          aria-label={t('picker.openDate')}
        >
          <DayPicker
            mode="single"
            animate
            locale={locale}
            selected={selected}
            defaultMonth={selected || new Date()}
            onSelect={handleSelect}
            className="dt-picker__calendar"
          />
          <div className="dt-picker__footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleToday}>
              {t('picker.today')}
            </button>
            {allowClear && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear}>
                {t('picker.clear')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
