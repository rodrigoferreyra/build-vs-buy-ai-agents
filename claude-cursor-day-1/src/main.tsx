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

const params = new URLSearchParams(location.search)
if (params.has('whitelabel')) store.actions.set({ dialog: 'theme' })
// ?design=<url of a .json design> – used by the Android app to open a shared design file
const designUrl = params.get('design')
if (designUrl)
  fetch(designUrl)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((t) => {
      store.actions.loadDoc(store.parseDoc(t))
      store.toast(`Opened “${store.getState().doc.name}”`)
    })
    .catch((e) => store.toast('Could not open design: ' + (e as Error).message))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
