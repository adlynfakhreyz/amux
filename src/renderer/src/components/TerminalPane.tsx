import { useEffect, useRef, useState } from 'react'
import type { DropEdge } from '../state/layout'
import { ensureSpawned, getEngine } from '../terminal/registry'

export const PANE_DRAG_TYPE = 'application/x-lynmux-pane'

interface Props {
  id: string
  cwd?: string
  title: string
  active: boolean
  /** Id of the pane currently being dragged anywhere in the workspace, or null. */
  draggingId: string | null
  onFocus: () => void
  onClose: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onDrop: (srcId: string, edge: DropEdge) => void
}

/** Which zone of the pane the pointer is over: the middle 40% swaps, otherwise the nearest edge. */
function edgeAt(e: React.DragEvent, el: HTMLElement): DropEdge {
  const r = el.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width
  const y = (e.clientY - r.top) / r.height
  if (x > 0.3 && x < 0.7 && y > 0.3 && y < 0.7) return 'center'
  const distances: [DropEdge, number][] = [
    ['left', x],
    ['right', 1 - x],
    ['top', y],
    ['bottom', 1 - y]
  ]
  return distances.sort((a, b) => a[1] - b[1])[0][0]
}

export function TerminalPane(props: Props): React.JSX.Element {
  const { id, cwd, title, active, draggingId, onFocus, onClose, onDragStart, onDragEnd, onDrop } = props
  const hostRef = useRef<HTMLDivElement>(null)
  const [hoverEdge, setHoverEdge] = useState<DropEdge | null>(null)

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

  useEffect(() => {
    if (!draggingId) setHoverEdge(null)
  }, [draggingId])

  const isDropTarget = draggingId !== null && draggingId !== id

  return (
    <div
      className={`pane${active ? ' pane-active' : ''}${draggingId === id ? ' pane-dragging' : ''}`}
      data-pane-id={id}
      onMouseDown={onFocus}
    >
      <div
        className="pane-header"
        draggable
        title="Drag to move this pane"
        onDragStart={(e) => {
          e.dataTransfer.setData(PANE_DRAG_TYPE, id)
          e.dataTransfer.effectAllowed = 'move'
          onDragStart()
        }}
        onDragEnd={onDragEnd}
      >
        <span className="pane-grip">⠿</span>
        <span className="pane-title">{title}</span>
        <button
          className="pane-close"
          title="Close pane (Ctrl+Shift+W)"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div ref={hostRef} className="pane-body" />
      {isDropTarget && (
        <div
          className="drop-overlay"
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            setHoverEdge(edgeAt(e, e.currentTarget))
          }}
          onDragLeave={() => setHoverEdge(null)}
          onDrop={(e) => {
            e.preventDefault()
            const src = e.dataTransfer.getData(PANE_DRAG_TYPE)
            if (src) onDrop(src, edgeAt(e, e.currentTarget))
            setHoverEdge(null)
          }}
        >
          {hoverEdge && <div className={`drop-preview drop-${hoverEdge}`}>{hoverEdge === 'center' ? 'swap' : ''}</div>}
        </div>
      )}
    </div>
  )
}
