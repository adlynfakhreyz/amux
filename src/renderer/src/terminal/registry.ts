import { createXtermEngine, type TerminalEngine } from './engine'

/**
 * One engine + shell per pane id, kept outside React. Splitting re-parents panes in the React tree,
 * which re-mounts components; the registry keeps the terminal (and its scrollback) alive through that.
 */
const engines = new Map<string, TerminalEngine>()
const spawned = new Set<string>()
let fontSize = 13

window.lymux.pty.onData((id, data) => engines.get(id)?.write(data))
window.lymux.pty.onExit((id) => engines.get(id)?.write('\r\n\x1b[2m[process exited]\x1b[0m\r\n'))

export function getEngine(id: string): TerminalEngine {
  let engine = engines.get(id)
  if (!engine) {
    engine = createXtermEngine(fontSize)
    engine.onInput((data) => window.lymux.pty.write(id, data))
    engines.set(id, engine)
  }
  return engine
}

/** Start the pane's shell once, at the size the terminal fitted to. */
export function ensureSpawned(id: string, cwd: string | undefined, cols: number, rows: number): void {
  if (spawned.has(id)) {
    window.lymux.pty.resize(id, cols, rows)
    return
  }
  spawned.add(id)
  void window.lymux.pty.spawn(id, { cwd, cols, rows })
}

/** Zoom every terminal. The pane size does not change, so refit here and tell each shell its new grid. */
export function setFontSize(size: number): void {
  if (size === fontSize) return
  fontSize = size
  for (const [id, engine] of engines) {
    engine.setFontSize(size)
    const { cols, rows } = engine.fit()
    if (spawned.has(id)) window.lymux.pty.resize(id, cols, rows)
  }
}

/** Called only when a pane is closed for good (not on re-mount). */
export function destroyPane(id: string): void {
  window.lymux.pty.kill(id)
  engines.get(id)?.dispose()
  engines.delete(id)
  spawned.delete(id)
}
