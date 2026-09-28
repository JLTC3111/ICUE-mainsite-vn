import { Component, createRef } from 'react'

const MOVING_LAYERS = [
  '.icue-mascot__bird', '.icue-mascot__head-motion',
  ...['body', 'crest', 'tail', 'foot-left', 'foot-right', 'wing-left', 'wing-right']
    .map(part => `.icue-mascot__part--${part}`),
]

/** Snapshot before React changes state selectors, then ease into the next loop. */
export default class MascotMotion extends Component {
  root = createRef()
  handoffs = new Map()
  motionPreference = null

  cancelHandoffs = () => {
    for (const animation of this.handoffs.values()) animation.cancel()
    this.handoffs.clear()
  }

  onMotionPreference = () => {
    if (this.motionPreference?.matches) this.cancelHandoffs()
  }

  syncMotionPreference() {
    this.motionPreference?.removeEventListener?.('change', this.onMotionPreference)
    this.motionPreference = this.props.enabled && typeof window !== 'undefined'
      ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null
    this.motionPreference?.addEventListener?.('change', this.onMotionPreference)
  }

  componentDidMount() {
    this.syncMotionPreference()
  }

  getSnapshotBeforeUpdate(previous) {
    if (previous.phase === this.props.phase || !previous.enabled || !this.props.enabled
      || this.motionPreference?.matches || !this.root.current?.querySelector
      || typeof window === 'undefined' || !window.DOMMatrix) return null

    return MOVING_LAYERS.flatMap(selector => {
      const node = this.root.current.querySelector(selector)
      if (!node?.animate) return []
      const style = window.getComputedStyle(node)
      return [{ selector, node, transform: style.transform, animationName: style.animationName }]
    })
  }

  componentDidUpdate(previous, _state, snapshot) {
    if (previous.enabled !== this.props.enabled) this.syncMotionPreference()
    if (!this.props.enabled || this.motionPreference?.matches) {
      this.cancelHandoffs()
      return
    }
    for (const before of snapshot || []) {
      const node = this.root.current.querySelector(before.selector)
      if (!node?.animate) continue
      const style = window.getComputedStyle(node)
      if (node === before.node && style.animationName === before.animationName) continue

      // A rapid interruption starts from the frame actually on screen, including
      // any previous handoff, instead of returning to either loop's first frame.
      this.handoffs.get(before.selector)?.cancel()
      this.handoffs.delete(before.selector)
      const current = window.getComputedStyle(node).transform
      const incoming = new window.DOMMatrix(current === 'none' ? undefined : current)
      const outgoing = new window.DOMMatrix(before.transform === 'none' ? undefined : before.transform)
      const offset = incoming.inverse().multiply(outgoing)
      if (![offset.a, offset.b, offset.c, offset.d, offset.e, offset.f].every(Number.isFinite) || offset.isIdentity) continue

      // Add a decaying offset over the incoming CSS animation. The new loop can
      // keep running, so there is no second jump when this bridge finishes.
      const animation = node.animate([
        { transform: offset.toString() },
        { transform: 'matrix(1, 0, 0, 1, 0, 0)' },
      ], { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', composite: 'add' })
      this.handoffs.set(before.selector, animation)
      animation.onfinish = () => {
        if (this.handoffs.get(before.selector) === animation) this.handoffs.delete(before.selector)
      }
    }
  }

  componentWillUnmount() {
    this.cancelHandoffs()
    this.motionPreference?.removeEventListener?.('change', this.onMotionPreference)
  }

  render() {
    return <span {...this.props.rootProps} ref={this.root}>{this.props.children}</span>
  }
}
