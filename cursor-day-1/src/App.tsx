import { useState } from 'react'
import { DesignEditor } from './components/DesignEditor'
import { VideoStudio } from './components/VideoStudio'
import { t, type UiLocale } from './utils/i18n'

type AppMode = 'design' | 'video'

export default function App() {
  const [mode, setMode] = useState<AppMode>('design')
  const [locale] = useState<UiLocale>('en')

  return (
    <div className="app-root">
      <nav className="mode-nav" aria-label="Editor mode">
        <button
          type="button"
          className={mode === 'design' ? 'active' : ''}
          aria-current={mode === 'design' ? 'page' : undefined}
          onClick={() => setMode('design')}
        >
          {t(locale, 'designMode')}
        </button>
        <button
          type="button"
          className={mode === 'video' ? 'active' : ''}
          aria-current={mode === 'video' ? 'page' : undefined}
          onClick={() => setMode('video')}
        >
          {t(locale, 'videoMode')}
        </button>
      </nav>
      {mode === 'design' ? <DesignEditor /> : <VideoStudio />}
    </div>
  )
}
