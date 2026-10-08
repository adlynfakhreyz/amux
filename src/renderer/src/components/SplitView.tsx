import { Fragment } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import type { LayoutNode } from '../../../shared/types'
import type { DropEdge } from '../state/layout'
import { TerminalPane } from './TerminalPane'

interface Props {
  node: LayoutNode
  activePaneId: string
  draggingId: string | null
  titleOf: (paneId: string, cwd?: string) => string
  onFocusPane: (id: string) => void
  onClosePane: (id: string) => void
  onResize: (splitId: string, sizes: number[]) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onMovePane: (srcId: string, targetId: string, edge: DropEdge) => void
}

/** Renders the layout tree recursively: splits become resizable panel groups, leaves become terminals. */
export function SplitView(props: Props): React.JSX.Element {
  const { node } = props
  if (node.type === 'pane') {
    return (
      <TerminalPane
        id={node.id}
        cwd={node.cwd}
        title={props.titleOf(node.id, node.cwd)}
        active={node.id === props.activePaneId}
        draggingId={props.draggingId}
        onFocus={() => props.onFocusPane(node.id)}
        onClose={() => props.onClosePane(node.id)}
        onDragStart={() => props.onDragStart(node.id)}
        onDragEnd={props.onDragEnd}
        onDrop={(srcId, edge) => props.onMovePane(srcId, node.id, edge)}
      />
    )
  }
  return (
    <PanelGroup
      id={node.id}
      direction={node.dir === 'row' ? 'horizontal' : 'vertical'}
      onLayout={(sizes) => props.onResize(node.id, sizes)}
    >
      {node.children.map((child, i) => (
        <Fragment key={child.id}>
          {i > 0 && <PanelResizeHandle className={`resize-handle resize-${node.dir}`} />}
          <Panel id={child.id} order={i} defaultSize={node.sizes[i]} minSize={5}>
            <SplitView {...props} node={child} />
          </Panel>
        </Fragment>
      ))}
    </PanelGroup>
  )
}
