import { useEffect, useRef } from 'react'
import { ensureSpawned, getEngine } from '../terminal/registry'

interface Props {
  id: string
  cwd?: string
  active: boolean
  onFocus: () => void
}

export function TerminalPane({ id, cwd, active, onFocus }: Props): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const engine = getEngine(id)
    host.appendChild(engine.element)

    const sync = (): void => {
      const { cols, rows } = engine.fit()
      ensureSpawned(id, cwd, cols, rows)
    }
    // Wait one frame so the panel has its final size before the first fit.
    const raf = requestAnimationFrame(sync)
    const observer = new ResizeObserver(() => sync())
    observer.observe(host)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      // Detach only; the registry keeps the terminal alive for the next mount.
      if (engine.element.parentElement === host) host.removeChild(engine.element)
    }
    // cwd only matters for the very first spawn, so it is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (active) getEngine(id).focus()
  }, [active, id])

  return <div ref={hostRef} className={`pane${active ? ' pane-active' : ''}`} onMouseDown={onFocus} />
}
