import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { reactErrorHandler } from '@sentry/react'
import './index.css'
import './styles/lattice.css'
import App from './App.tsx'
import { initSentry } from './lib/sentry'

initSentry()

createRoot(document.getElementById('root')!, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
