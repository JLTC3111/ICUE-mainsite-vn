import { Component } from 'react'

// Isolates a subtree so a render/effect crash there can't take down the page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => this.setState({ hasError: false })

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="error-boundary">
            <p>Something went wrong loading this section.</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={this.handleReset}>
              Retry
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
