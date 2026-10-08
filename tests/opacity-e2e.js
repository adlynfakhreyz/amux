// End-to-end test for background opacity. Run inside the app window via the *_EVAL dev hook.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const api = window.lymux
  const ui = async () => {
    await sleep(1300) // session save is debounced by 1s
    return (await api.session.load()).ui ?? {}
  }
  const key = (code) =>
    window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }))
  const alphaOf = (sel) => {
    const m = getComputedStyle(document.querySelector(sel)).backgroundColor.match(/rgba?\(([^)]+)\)/)
    const parts = m ? m[1].split(/[ ,/]+/).filter(Boolean) : []
    return parts.length === 4 ? Number(parts[3]) : 1
  }
  const out = {}
  out.defaultAlpha = alphaOf('.workspace-view')
  out.bodyIsTransparent = alphaOf('body') === 0
  key('BracketLeft')
  await sleep(50)
  out.toast = document.querySelector('.zoom-toast')?.textContent
  out.savedAfterDecrease = (await ui()).opacity
  out.paneAlphaAfterDecrease = alphaOf('.workspace-view')
  for (let i = 0; i < 20; i++) key('BracketLeft')
  out.clampedMin = (await ui()).opacity
  for (let i = 0; i < 20; i++) key('BracketRight')
  out.clampedMax = (await ui()).opacity
  out.opaqueAlpha = alphaOf('.workspace-view')
  return out
})()
