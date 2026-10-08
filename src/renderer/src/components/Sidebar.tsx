import { useState } from 'react'
import type { PaneMeta, Workspace } from '../../../shared/types'

interface Props {
  workspaces: Workspace[]
  activeId: string
  meta: Record<string, PaneMeta>
  homeDir: string
  onSelect: (id: string) => void
  onNew: () => void
  onRename: (id: string, name: string) => void
  onClose: (id: string) => void
}

const shortPath = (path: string | null | undefined, home: string): string =>
  !path ? '' : path === home ? '~' : path.startsWith(home + '/') ? '~' + path.slice(home.length) : path

export function Sidebar({ workspaces, activeId, meta, homeDir, onSelect, onNew, onRename, onClose }: Props): React.JSX.Element {
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <aside className="sidebar">
      <div className="sidebar-title">amux</div>
      <ul className="workspace-list">
        {workspaces.map((ws) => {
          const m = meta[ws.activePaneId]
          return (
            <li
              key={ws.id}
              className={`workspace${ws.id === activeId ? ' workspace-active' : ''}`}
              onClick={() => onSelect(ws.id)}
              onDoubleClick={() => setEditing(ws.id)}
            >
              {editing === ws.id ? (
                <input
                  className="workspace-rename"
                  autoFocus
                  defaultValue={ws.name}
                  onBlur={(e) => {
                    onRename(ws.id, e.currentTarget.value.trim() || ws.name)
                    setEditing(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') setEditing(null)
                  }}
                />
              ) : (
                <div className="workspace-name">{ws.name}</div>
              )}
              <div className="workspace-meta">
                {shortPath(m?.cwd, homeDir)}
                {m?.branch && <span className="workspace-branch"> ⎇ {m.branch}</span>}
              </div>
              <button
                className="workspace-close"
                title="Close workspace"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(ws.id)
                }}
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>
      <button className="workspace-new" onClick={onNew}>
        + New workspace
      </button>
      <div className="shortcuts">
        <div>Ctrl+Shift+D split right</div>
        <div>Ctrl+Shift+E split down</div>
        <div>Ctrl+Shift+W close pane</div>
        <div>Ctrl+Shift+N new workspace</div>
        <div>Ctrl+PgUp/PgDn switch</div>
      </div>
    </aside>
  )
}
