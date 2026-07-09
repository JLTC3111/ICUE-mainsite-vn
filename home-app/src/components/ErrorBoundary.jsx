import { Component } from 'react'
import { debugLog } from '../lib/debugLog'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // #region agent log
    debugLog('ErrorBoundary.jsx:catch', 'react render error', {
      error: String(error),
      componentStack: info?.componentStack?.slice(0, 500),
    }, 'A')
    // #endregion
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null
    }
    return this.props.children
  }
}
