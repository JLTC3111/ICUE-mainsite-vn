import './RainbowButton.css'

export default function RainbowButton({ href, children, className = '' }) {
  return (
    <a
      href={href}
      className={`rainbow-button ${className}`.trim()}
    >
      {children}
    </a>
  )
}
