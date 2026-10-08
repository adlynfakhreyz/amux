import { Fragment } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import type { LayoutNode } from '../../../shared/types'
import { TerminalPane } from './TerminalPane'

interface Props {
  node: LayoutNode
  activePaneId: string
  onFocusPane: (id: string) => void
  onResize: (splitId: string, sizes: number[]) => void
}

/** Renders the layout tree recursively: splits become resizable panel groups, leaves become terminals. */
export function SplitView({ node, activePaneId, onFocusPane, onResize }: Props): React.JSX.Element {
  if (node.type === 'pane') {
    return (
      <TerminalPane id={node.id} cwd={node.cwd} active={node.id === activePaneId} onFocus={() => onFocusPane(node.id)} />
    )
  }
  return (
    <PanelGroup
      id={node.id}
      direction={node.dir === 'row' ? 'horizontal' : 'vertical'}
      onLayout={(sizes) => onResize(node.id, sizes)}
    >
      {node.children.map((child, i) => (
        <Fragment key={child.id}>
          {i > 0 && <PanelResizeHandle className={`resize-handle resize-${node.dir}`} />}
          <Panel id={child.id} order={i} defaultSize={node.sizes[i]} minSize={5}>
            <SplitView node={child} activePaneId={activePaneId} onFocusPane={onFocusPane} onResize={onResize} />
          </Panel>
        </Fragment>
      ))}
    </PanelGroup>
  )
}
