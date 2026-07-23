import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import {
  formatDisplayTime,
  parseTimeValue,
  toTimeValue,
  uses12HourClock,
} from '../lib/dayPickerLocale'
import './DateTimePicker.css'

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i)
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

function to12HourParts(hours24) {
  const period = hours24 >= 12 ? 'pm' : 'am'
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return { hour12, period }
}

function from12HourParts(hour12, period) {
  if (period === 'am') return hour12 === 12 ? 0 : hour12
  return hour12 === 12 ? 12 : hour12 + 12
}

/**
 * Locale-aware time field. Value is always HH:mm (24h), or ''.
 */
export default function TimePickerField({
  value = '',
  onChange,
  id,
  className = '',
  disabled = false,
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language
  const hour12 = uses12HourClock(lang)
  const autoId = useId()
  const fieldId = id || autoId
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)

  const parsed = useMemo(() => parseTimeValue(value) || { hours: 0, minutes: 0 }, [value])
  const parts12 = to12HourParts(parsed.hours)
  const label = formatDisplayTime(value, lang) || t('picker.placeholderTime')

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

  const commit = (hours, minutes) => {
    onChange?.(toTimeValue(hours, minutes))
  }

  const onHourChange = (next) => {
    if (hour12) {
      commit(from12HourParts(Number(next), parts12.period), parsed.minutes)
    } else {
      commit(Number(next), parsed.minutes)
    }
  }

  const onMinuteChange = (next) => {
    commit(parsed.hours, Number(next))
  }

  const onPeriodChange = (period) => {
    commit(from12HourParts(parts12.hour12, period), parsed.minutes)
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
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={value ? 'dt-picker__value' : 'dt-picker__placeholder'}>
          {label}
        </span>
        <Clock size={16} aria-hidden="true" className="dt-picker__icon" />
      </button>

      {open && (
        <div
          className="dt-picker__popover dt-picker__popover--time"
          role="dialog"
          aria-label={t('picker.openTime')}
        >
          <div className="dt-picker__time-row">
            <label className="dt-picker__time-field">
              <span>{t('picker.hour')}</span>
              <select
                className="input"
                value={hour12 ? parts12.hour12 : parsed.hours}
                onChange={(e) => onHourChange(e.target.value)}
              >
                {(hour12 ? HOURS_12 : HOURS_24).map((h) => (
                  <option key={h} value={h}>
                    {hour12 ? h : String(h).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </label>

            <span className="dt-picker__time-sep" aria-hidden="true">:</span>

            <label className="dt-picker__time-field">
              <span>{t('picker.minute')}</span>
              <select
                className="input"
                value={parsed.minutes}
                onChange={(e) => onMinuteChange(e.target.value)}
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </label>

            {hour12 && (
              <label className="dt-picker__time-field">
                <span>{t('picker.period')}</span>
                <select
                  className="input"
                  value={parts12.period}
                  onChange={(e) => onPeriodChange(e.target.value)}
                >
                  <option value="am">{t('picker.am')}</option>
                  <option value="pm">{t('picker.pm')}</option>
                </select>
              </label>
            )}
          </div>

          <div className="dt-picker__footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={close}>
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
