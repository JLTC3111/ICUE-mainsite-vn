import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './lib/i18n'
import './styles/theme.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
