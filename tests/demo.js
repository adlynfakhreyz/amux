// Scripted demo, run with LYMUX_EVAL + LYMUX_RECORD to produce docs/demo.gif (see scripts/record-demo.sh).
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const api = window.lymux
  const $ = (sel) => document.querySelector(sel)
  const key = (code, mods) =>
    window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true, cancelable: true, ...mods }))
  const session = async () => {
    await sleep(1200)
    return api.session.load()
  }
  const panes = async () => {
    const s = await session()
    const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId)
    const ids = (n) => (n.type === 'pane' ? [n.id] : n.children.flatMap(ids))
    return ids(ws.root)
  }
  // Type like a person: one character at a time into the pane's shell.
  const type = async (id, text) => {
    for (const ch of text) {
      api.pty.write(id, ch)
      await sleep(45)
    }
    api.pty.write(id, '\r')
  }
  const paneEl = (id) => document.querySelector(`.pane[data-pane-id="${id}"]`)
  const drag = async (src, target, fx, fy) => {
    const dt = new DataTransfer()
    const header = paneEl(src).querySelector('.pane-header')
    header.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }))
    await sleep(200)
    const overlay = paneEl(target).querySelector('.drop-overlay')
    const r = overlay.getBoundingClientRect()
    const at = { clientX: r.left + r.width * fx, clientY: r.top + r.height * fy }
    overlay.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, ...at }))
    await sleep(1100) // hold so the drop preview is visible
    overlay.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, ...at }))
    header.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }))
  }

  await sleep(1500)
  let [a] = await panes()
  await type(a, 'echo "lymux: a terminal multiplexer for Linux"')
  await sleep(900)

  // Split right and down
  key('KeyD', { ctrlKey: true, shiftKey: true })
  let [, b] = await panes()
  await type(b, 'cd ~/dev/projects/lymux && git --no-pager log --oneline -4')
  await sleep(800)
  key('KeyE', { ctrlKey: true, shiftKey: true })
  const ids = await panes()
  const c = ids[ids.length - 1]
  await type(c, 'ls')
  await sleep(1000)

  // Drag the right pane below the left one, then swap two panes
  await drag(b, a, 0.5, 0.88)
  await sleep(900)
  await drag(c, a, 0.5, 0.5)
  await sleep(900)

  // Zoom in and back out
  key('Equal', { ctrlKey: true })
  await sleep(250)
  key('Equal', { ctrlKey: true })
  await sleep(900)
  key('Digit0', { ctrlKey: true })
  await sleep(700)

  // New workspace, then switch back
  key('KeyN', { ctrlKey: true, shiftKey: true })
  await sleep(1200)
  key('PageUp', { ctrlKey: true })
  await sleep(900)

  // Auto-hide sidebar: hide, reveal from the left edge, pin again
  $('.sidebar-header .icon-button').click()
  await sleep(900)
  $('.sidebar-hover-zone').dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }))
  await sleep(1300)
  $('.sidebar-header .icon-button').click()
  await sleep(1200)
  return 'done'
})()
