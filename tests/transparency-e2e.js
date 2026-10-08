// End-to-end test: the background is translucent at a fixed level and there is no opacity shortcut.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const alphaOf = (sel) => {
    const m = getComputedStyle(document.querySelector(sel)).backgroundColor.match(/rgba?\(([^)]+)\)/)
    const parts = m ? m[1].split(/[ ,/]+/).filter(Boolean) : []
    return parts.length === 4 ? Number(parts[3]) : 1
  }
  const out = { paneAlpha: alphaOf('.workspace-view'), bodyIsTransparent: alphaOf('body') === 0 }
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'BracketLeft', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }))
  await sleep(200)
  out.shortcutIgnored = alphaOf('.workspace-view') === out.paneAlpha && !document.querySelector('.zoom-toast')
  return out
})()
