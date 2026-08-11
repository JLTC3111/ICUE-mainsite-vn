import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import App from './App.jsx'

gsap.registerPlugin(ScrollTrigger)
import { installGlobalDebugHandlers } from './lib/debugLog'
import './lib/i18n'
import '../../styles.css'
import './styles/footer-theme.css'

window.gsap = gsap
installGlobalDebugHandlers()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
