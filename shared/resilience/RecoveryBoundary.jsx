import { Component } from 'react'
import { subscribeToPageResume } from './pageResume.js'
import './recovery.css'

const COPY = {
  vi: ['Đang tải…', 'Không thể tải nội dung này.', 'Thử lại', 'Tải lại trang'],
  en: ['Loading…', 'This content could not be loaded.', 'Retry', 'Reload page'],
  de: ['Wird geladen…', 'Dieser Inhalt konnte nicht geladen werden.', 'Erneut versuchen', 'Seite neu laden'],
  fr: ['Chargement…', 'Ce contenu n’a pas pu être chargé.', 'Réessayer', 'Recharger la page'],
  ko: ['불러오는 중…', '콘텐츠를 불러오지 못했습니다.', '다시 시도', '페이지 새로고침'],
  ja: ['読み込み中…', 'コンテンツを読み込めませんでした。', '再試行', 'ページを再読み込み'],
}

export function RecoveryNotice({ loading = false, onRetry, allowReload = false, compact = false }) {
  const lang = typeof document === 'undefined' ? 'en' : document.documentElement.lang.split('-')[0]
  const copy = COPY[lang] || COPY.en
  return (
    <div className={`icue-recovery${compact ? ' icue-recovery--compact' : ''}`} role={loading ? 'status' : 'alert'}>
      <p>{copy[loading ? 0 : 1]}</p>
      {!loading && <div className="icue-recovery__actions">
        {onRetry && <button type="button" onClick={onRetry}>{copy[2]}</button>}
        {allowReload && <button type="button" onClick={() => window.location.reload()}>{copy[3]}</button>}
      </div>}
    </div>
  )
}

export default class RecoveryBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('[recovery]', error, info) }
  componentDidMount() {
    this.unsubscribe = subscribeToPageResume(() => {
      if (this.state.error?.code === 'ICUE_LOAD_ERROR') this.retry()
    }, { minHiddenMs: 0 })
  }
  componentWillUnmount() { this.unsubscribe?.() }
  retry = () => {
    this.props.onRetry?.()
    this.setState({ error: null })
  }
  render() {
    if (this.state.error) {
      return <RecoveryNotice onRetry={this.retry} allowReload={this.props.allowReload} compact={this.props.compact} />
    }
    return this.props.children
  }
}
