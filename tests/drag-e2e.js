// End-to-end drag test, run inside the lynmux window via LYNMUX_EVAL.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const shape = (n) => (n.type === 'pane' ? n.id : `${n.dir}(${n.children.map(shape).join(',')})`)
  const tree = async () => {
    await sleep(1600) // session save is debounced by 1s
    const s = await window.lynmux.session.load()
    return s.workspaces.find((w) => w.id === s.activeWorkspaceId).root
  }
  const paneIds = (n) => (n.type === 'pane' ? [n.id] : n.children.flatMap(paneIds))
  const paneEl = (id) => [...document.querySelectorAll('.pane')].find((el) => el.dataset.paneId === id)

  // Drag the pane `src` by its header and drop it at relative position (fx, fy) of pane `target`.
  const drag = async (src, target, fx, fy) => {
    const dt = new DataTransfer()
    const header = paneEl(src).querySelector('.pane-header')
    header.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }))
    await sleep(150) // let React render the drop overlays
    const overlay = paneEl(target).querySelector('.drop-overlay')
    if (!overlay) return 'no drop overlay on target'
    const r = overlay.getBoundingClientRect()
    const at = { clientX: r.left + r.width * fx, clientY: r.top + r.height * fy }
    overlay.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt, ...at }))
    overlay.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, ...at }))
    await sleep(100)
    const preview = overlay.querySelector('.drop-preview')?.className ?? 'none'
    overlay.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, ...at }))
    header.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }))
    await sleep(150)
    return preview
  }

  const out = {}
  // Start: split right so there are two panes side by side.
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', code: 'KeyD', ctrlKey: true, shiftKey: true, bubbles: true }))
  let root = await tree()
  const [A, B] = paneIds(root)
  out.start = shape(root).replaceAll(A, 'A').replaceAll(B, 'B')

  // 1. Move the right pane (B) to the bottom of A.
  out.previewBottom = await drag(B, A, 0.5, 0.9)
  root = await tree()
  out.afterMoveToBottom = shape(root).replaceAll(A, 'A').replaceAll(B, 'B')

  // 2. Move it back to the right of A.
  out.previewRight = await drag(B, A, 0.9, 0.5)
  root = await tree()
  out.afterMoveToRight = shape(root).replaceAll(A, 'A').replaceAll(B, 'B')

  // 3. Swap by dropping in the middle.
  out.previewCenter = await drag(B, A, 0.5, 0.5)
  root = await tree()
  out.afterSwap = shape(root).replaceAll(A, 'A').replaceAll(B, 'B')

  out.overlaysLeftBehind = document.querySelectorAll('.drop-overlay').length
  return out
})()
