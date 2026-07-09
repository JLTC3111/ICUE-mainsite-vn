import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import App from './App.jsx'
import { installGlobalDebugHandlers } from './lib/debugLog'
import '../../styles.css'
import './styles/footer-theme.css'

window.gsap = gsap
installGlobalDebugHandlers()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
