import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import * as store from './store'
import * as pdf from './pdf'
import * as render from './render'

// debugging / test hook
;(window as unknown as { __ed: typeof store }).__ed = store
;(window as unknown as { __lib: unknown }).__lib = { pdf, render }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
