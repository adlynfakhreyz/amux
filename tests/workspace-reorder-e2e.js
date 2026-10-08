// End-to-end test: drag workspaces in the sidebar to reorder them. Run inside the lymux window via LYMUX_EVAL.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const key = (code, mods = {}) =>
    window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true, cancelable: true, ...mods }))
  const items = () => [...document.querySelectorAll('.workspace')]
  const names = () => items().map((el) => el.querySelector('.workspace-name').textContent)
  const saved = async () => {
    await sleep(1300) // session save is debounced by 1s
    return (await window.lymux.session.load()).workspaces.map((w) => w.name)
  }

  // Drag workspace at index `from` onto the upper (after=false) or lower half of the one at index `to`.
  const drag = async (from, to, after) => {
    const dt = new DataTransfer()
    const src = items()[from]
    src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }))
    await sleep(50)
    const target = items()[to]
    const r = target.getBoundingClientRect()
    const clientY = after ? r.bottom - 2 : r.top + 2
    target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientY }))
    await sleep(50)
    const indicator = target.className.match(/workspace-drop-(before|after)/)?.[1]
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY }))
    src.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }))
    await sleep(100)
    return indicator
  }

  key('KeyN', { ctrlKey: true, shiftKey: true })
  await sleep(300)
  key('KeyN', { ctrlKey: true, shiftKey: true })
  await sleep(300)
  const out = { start: names() } // [workspace 1, workspace 2, workspace 3]

  out.indicator = await drag(0, 1, true) // first below second
  out.firstToSecond = names()
  await drag(2, 0, false) // last to the top
  out.lastToTop = names()
  await drag(0, 2, true) // top to the end
  out.topToEnd = names()
  await drag(1, 1, false) // onto itself: no change
  out.ontoSelf = names()
  out.persisted = await saved()
  out.noLeftoverIndicator = !document.querySelector('.workspace-drop-before, .workspace-drop-after, .workspace-dragging')
  return out
})()
