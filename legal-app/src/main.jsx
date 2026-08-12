import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import './lib/i18n'
import App from './App'
import './legal.css'
import '@icue/styles/icue-base.css'
import '@icue/styles/radius-reset.css'

/*
 * reducedMotion="user" makes every motion/react animation in the tree honour
 * the visitor's OS setting. The vendored magicui / reactbits components never
 * checked it individually; this settles the JS half for all of them at once
 * (the CSS half lives in shared/styles/motion.css).
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
