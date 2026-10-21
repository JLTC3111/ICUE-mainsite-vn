import { Cpu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import usePrefersReducedMotion from '../../../shared/ui/usePrefersReducedMotion.js'
import { useHomeBeamsEnabled } from '../hooks/useHomeBeamsEnabled.js'
import './HomeBeamsToggle.css'

const LABELS = {
  vi: ['Bật hiệu ứng nền và tia sáng', 'Tắt hiệu ứng nền và tia sáng', 'Hiệu ứng nền và tia sáng đang tắt theo cài đặt giảm chuyển động'],
  en: ['Turn on background and beam effects', 'Turn off background and beam effects', 'Background and beam effects are off while reduced motion is enabled'],
  de: ['Hintergrund- und Lichtstrahleffekte einschalten', 'Hintergrund- und Lichtstrahleffekte ausschalten', 'Hintergrund- und Lichtstrahleffekte sind bei reduzierter Bewegung ausgeschaltet'],
  fr: ['Activer les effets de fond et les faisceaux lumineux', 'Désactiver les effets de fond et les faisceaux lumineux', 'Les effets de fond et les faisceaux sont désactivés lorsque les animations sont réduites'],
  ja: ['背景と光のラインのエフェクトをオンにする', '背景と光のラインのエフェクトをオフにする', '動きを減らす設定により背景と光のラインのエフェクトはオフです'],
  ko: ['배경 및 빛줄기 효과 켜기', '배경 및 빛줄기 효과 끄기', '동작 줄이기 설정으로 배경 및 빛줄기 효과가 꺼져 있습니다'],
}

export default function HomeBeamsToggle() {
  const { i18n } = useTranslation()
  const [enabled, setEnabled] = useHomeBeamsEnabled()
  const reducedMotion = usePrefersReducedMotion()
  const language = String(i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().split(/[-_]/)[0]
  const labels = LABELS[language] || LABELS.en
  const label = labels[reducedMotion ? 2 : enabled ? 1 : 0]

  return (
    <button
      type="button"
      className="home-beams-toggle"
      aria-label={label}
      title={label}
      aria-pressed={enabled && !reducedMotion}
      disabled={reducedMotion}
      onClick={() => setEnabled(value => !value)}
    >
      <Cpu size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />
    </button>
  )
}
