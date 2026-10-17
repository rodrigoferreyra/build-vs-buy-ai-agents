import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

if (new URLSearchParams(window.location.search).get('headless') === '1') {
  void import('./headless/exportBridge').then((m) => m.installHeadlessBridge())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
