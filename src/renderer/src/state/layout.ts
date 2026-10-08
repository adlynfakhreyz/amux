import type { LayoutNode, Session, SplitDir, Workspace } from '../../../shared/types'

// Pure functions over the layout tree. Every change returns a new tree so React state stays immutable.

export const uid = (): string => crypto.randomUUID().slice(0, 8)

export const newPane = (cwd?: string): LayoutNode => ({ type: 'pane', id: uid(), cwd })

export function newWorkspace(name: string, cwd?: string): Workspace {
  const root = newPane(cwd)
  return { id: uid(), name, root, activePaneId: root.id }
}

export function newSession(cwd?: string): Session {
  const ws = newWorkspace('main', cwd)
  return { version: 1, workspaces: [ws], activeWorkspaceId: ws.id }
}

export function listPanes(node: LayoutNode): Extract<LayoutNode, { type: 'pane' }>[] {
  return node.type === 'pane' ? [node] : node.children.flatMap(listPanes)
}

const equal = (n: number): number[] => Array.from({ length: n }, () => 100 / n)

/** Put a new pane next to `paneId`. Joins the parent split when it already runs in `dir`, so repeated splits stay flat. */
export function splitPane(root: LayoutNode, paneId: string, dir: SplitDir, pane: LayoutNode): LayoutNode {
  if (root.type === 'pane') {
    return root.id === paneId ? { type: 'split', id: uid(), dir, children: [root, pane], sizes: [50, 50] } : root
  }
  const idx = root.children.findIndex((c) => c.type === 'pane' && c.id === paneId)
  if (idx >= 0 && root.dir === dir) {
    const children = [...root.children.slice(0, idx + 1), pane, ...root.children.slice(idx + 1)]
    return { ...root, children, sizes: equal(children.length) }
  }
  return { ...root, children: root.children.map((c) => splitPane(c, paneId, dir, pane)) }
}

/** Remove a pane; splits left with one child collapse into that child. Returns null when nothing is left. */
export function removePane(root: LayoutNode, paneId: string): LayoutNode | null {
  if (root.type === 'pane') return root.id === paneId ? null : root
  const children = root.children.map((c) => removePane(c, paneId)).filter((c): c is LayoutNode => c !== null)
  if (children.length === 0) return null
  if (children.length === 1) return children[0]
  return { ...root, children, sizes: children.length === root.children.length ? root.sizes : equal(children.length) }
}

export function setSizes(root: LayoutNode, splitId: string, sizes: number[]): LayoutNode {
  if (root.type === 'pane') return root
  if (root.id === splitId) return { ...root, sizes }
  return { ...root, children: root.children.map((c) => setSizes(c, splitId, sizes)) }
}

export function setPaneCwds(root: LayoutNode, cwds: Record<string, string | null>): LayoutNode {
  if (root.type === 'pane') return cwds[root.id] ? { ...root, cwd: cwds[root.id] ?? undefined } : root
  return { ...root, children: root.children.map((c) => setPaneCwds(c, cwds)) }
}
