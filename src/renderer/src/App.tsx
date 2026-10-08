import { useCallback, useEffect, useRef, useState } from 'react'
import type { PaneMeta, Session, SplitDir, Workspace } from '../../shared/types'
import { Sidebar } from './components/Sidebar'
import { SplitView } from './components/SplitView'
import { destroyPane } from './terminal/registry'
import {
  listPanes,
  newPane,
  newSession,
  newWorkspace,
  removePane,
  setPaneCwds,
  setSizes,
  splitPane
} from './state/layout'

const api = window.amux
const META_POLL_MS = 2000
const SAVE_DEBOUNCE_MS = 1000

export function App(): React.JSX.Element | null {
  const [session, setSession] = useState<Session | null>(null)
  const [meta, setMeta] = useState<Record<string, PaneMeta>>({})
  const sessionRef = useRef(session)
  sessionRef.current = session

  // Restore the last session, or start fresh in ~.
  useEffect(() => {
    void api.session.load().then((s) => setSession(s ?? newSession(api.homeDir)))
  }, [])

  // Persist (debounced) whenever the layout changes.
  useEffect(() => {
    if (!session) return
    const t = setTimeout(() => void api.session.save(session), SAVE_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [session])

  // Poll each pane's cwd and git branch; write cwds back into the layout so a restore reopens them in place.
  useEffect(() => {
    const tick = async (): Promise<void> => {
      const s = sessionRef.current
      if (!s) return
      const ids = s.workspaces.flatMap((w) => listPanes(w.root).map((p) => p.id))
      const m = await api.meta(ids)
      setMeta(m)
      const changed = s.workspaces.some((w) => listPanes(w.root).some((p) => m[p.id]?.cwd && m[p.id].cwd !== p.cwd))
      if (changed) {
        const cwds = Object.fromEntries(Object.entries(m).map(([id, v]) => [id, v.cwd]))
        setSession((cur) => cur && { ...cur, workspaces: cur.workspaces.map((w) => ({ ...w, root: setPaneCwds(w.root, cwds) })) })
      }
    }
    const t = setInterval(() => void tick(), META_POLL_MS)
    return () => clearInterval(t)
  }, [])

  const updateWorkspace = useCallback((id: string, fn: (w: Workspace) => Workspace) => {
    setSession((s) => s && { ...s, workspaces: s.workspaces.map((w) => (w.id === id ? fn(w) : w)) })
  }, [])

  const active = session?.workspaces.find((w) => w.id === session.activeWorkspaceId)

  const activeCwd = async (): Promise<string> => {
    if (!active) return api.homeDir
    const m = await api.meta([active.activePaneId])
    return m[active.activePaneId]?.cwd ?? api.homeDir
  }

  const split = async (dir: SplitDir): Promise<void> => {
    if (!active) return
    const pane = newPane(await activeCwd())
    updateWorkspace(active.id, (w) => ({ ...w, root: splitPane(w.root, w.activePaneId, dir, pane), activePaneId: pane.id }))
  }

  const closeWorkspace = (id: string): void => {
    setSession((s) => {
      if (!s) return s
      const ws = s.workspaces.find((w) => w.id === id)
      ws && listPanes(ws.root).forEach((p) => destroyPane(p.id))
      const rest = s.workspaces.filter((w) => w.id !== id)
      if (rest.length === 0) return newSession(api.homeDir)
      const activeWorkspaceId = s.activeWorkspaceId === id ? rest[0].id : s.activeWorkspaceId
      return { ...s, workspaces: rest, activeWorkspaceId }
    })
  }

  const closePane = (): void => {
    if (!active) return
    const id = active.activePaneId
    const root = removePane(active.root, id)
    destroyPane(id)
    if (!root) return closeWorkspace(active.id)
    updateWorkspace(active.id, (w) => ({ ...w, root, activePaneId: listPanes(root)[0].id }))
  }

  const addWorkspace = async (): Promise<void> => {
    const ws = newWorkspace(`workspace ${(session?.workspaces.length ?? 0) + 1}`, await activeCwd())
    setSession((s) => s && { ...s, workspaces: [...s.workspaces, ws], activeWorkspaceId: ws.id })
  }

  const cycleWorkspace = (step: number): void => {
    setSession((s) => {
      if (!s) return s
      const i = s.workspaces.findIndex((w) => w.id === s.activeWorkspaceId)
      const next = s.workspaces[(i + step + s.workspaces.length) % s.workspaces.length]
      return { ...s, activeWorkspaceId: next.id }
    })
  }

  // App shortcuts are caught in the capture phase, before the focused terminal sees the key.
  const handlers = useRef({ split, closePane, addWorkspace, cycleWorkspace })
  handlers.current = { split, closePane, addWorkspace, cycleWorkspace }
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const h = handlers.current
      let handled = true
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') void h.split('row')
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyE') void h.split('column')
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyW') h.closePane()
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyN') void h.addWorkspace()
      else if (e.ctrlKey && e.code === 'PageDown') h.cycleWorkspace(1)
      else if (e.ctrlKey && e.code === 'PageUp') h.cycleWorkspace(-1)
      else handled = false
      if (handled) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  if (!session || !active) return null

  return (
    <div className="app">
      <Sidebar
        workspaces={session.workspaces}
        activeId={active.id}
        meta={meta}
        homeDir={api.homeDir}
        onSelect={(id) => setSession({ ...session, activeWorkspaceId: id })}
        onNew={() => void addWorkspace()}
        onRename={(id, name) => updateWorkspace(id, (w) => ({ ...w, name }))}
        onClose={closeWorkspace}
      />
      <main className="workspace-view" key={active.id}>
        <SplitView
          node={active.root}
          activePaneId={active.activePaneId}
          onFocusPane={(id) => updateWorkspace(active.id, (w) => ({ ...w, activePaneId: id }))}
          onResize={(splitId, sizes) => updateWorkspace(active.id, (w) => ({ ...w, root: setSizes(w.root, splitId, sizes) }))}
        />
      </main>
    </div>
  )
}
