import { createRoot } from 'react-dom/client'
import '@xterm/xterm/css/xterm.css'
import './fonts.css'
import './styles.css'
import { App } from './App'
import { FONT_FAMILY_NAMES } from './terminal/engine'

// xterm measures cell size when a terminal opens, so the fonts must be loaded first or the grid is sized for a fallback font.
async function loadFonts(): Promise<void> {
  await Promise.allSettled(
    FONT_FAMILY_NAMES.flatMap((f) => [document.fonts.load(`13px "${f}"`), document.fonts.load(`bold 13px "${f}"`)])
  )
}

void loadFonts().then(() => createRoot(document.getElementById('root')!).render(<App />))
