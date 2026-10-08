import { join } from 'node:path'
import { homedir } from 'node:os'
import { readFile, writeFile } from 'node:fs/promises'
import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { PtyManager } from './pty'
import { loadSession, saveSession } from './session'
import { gitBranch } from './git'
import type { PaneMeta, Session, SpawnOptions } from '../shared/types'
import icon from '../../resources/icon.png?asset'

// AppImages cannot ship a setuid chrome-sandbox, and Ubuntu 24.04+ blocks the namespace sandbox for them.
// The .deb sets chrome-sandbox up properly, so only the AppImage opts out.
if (process.platform === 'linux' && process.env.APPIMAGE) app.commandLine.appendSwitch('no-sandbox')

// Dev/test aid: keep session state in a separate directory so test runs never touch the real ~/.config/lymux.
if (process.env.LYMUX_USER_DATA) app.setPath('userData', process.env.LYMUX_USER_DATA)

let win: BrowserWindow | null = null
const ptys = new PtyManager(() => (win && !win.isDestroyed() ? win.webContents : null))

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'lymux',
    // Transparent window: the renderer paints translucent backgrounds so desktop blur (e.g. Blur my Shell) shows through.
    transparent: true,
    backgroundColor: '#00000000',
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      additionalArguments: [`--lymux-home=${homedir()}`],
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))

  // Dev aid: LYMUX_SCREENSHOT=/path.png captures the window once the shells have drawn, then quits.
  const shot = process.env.LYMUX_SCREENSHOT
  if (shot) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const image = await win?.webContents.capturePage()
        if (image) await writeFile(shot, image.toPNG())
        app.quit()
      }, Number(process.env.LYMUX_SCREENSHOT_DELAY ?? 5000))
    })
  }

  // Dev aid for end-to-end checks: LYMUX_EVAL=/path.js runs that script in the renderer once loaded,
  // prints its (awaited) result as JSON to stdout, then quits.
  const evalFile = process.env.LYMUX_EVAL
  if (evalFile) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const code = await readFile(evalFile, 'utf8')
          const result = await win?.webContents.executeJavaScript(code)
          process.stdout.write(`LYMUX_EVAL_RESULT ${JSON.stringify(result)}\n`)
        } catch (err) {
          process.stdout.write(`LYMUX_EVAL_ERROR ${String(err)}\n`)
        }
        app.quit()
      }, Number(process.env.LYMUX_EVAL_DELAY ?? 4000))
    })
  }

  win.on('closed', () => {
    win = null
  })
}

ipcMain.handle('pty:spawn', (_e, id: string, opts: SpawnOptions) => ptys.spawn(id, opts))
ipcMain.on('pty:write', (_e, id: string, data: string) => ptys.write(id, data))
ipcMain.on('pty:resize', (_e, id: string, cols: number, rows: number) => ptys.resize(id, cols, rows))
ipcMain.on('pty:kill', (_e, id: string) => ptys.kill(id))
ipcMain.handle('session:load', () => loadSession())
ipcMain.handle('session:save', (_e, session: Session) => saveSession(session))
ipcMain.handle('meta:get', async (_e, ids: string[]) => {
  const out: Record<string, PaneMeta> = {}
  await Promise.all(
    ids.map(async (id) => {
      const cwd = ptys.cwdOf(id)
      out[id] = { cwd, branch: cwd ? await gitBranch(cwd) : null }
    })
  )
  return out
})

app.whenReady().then(() => {
  // No app menu: its default zoom accelerators (Ctrl+=/-) would zoom the whole UI instead of the terminal font.
  Menu.setApplicationMenu(null)
  createWindow()
})

app.on('window-all-closed', () => {
  // v1: shells die with the app. A background daemon that keeps them alive is on the roadmap.
  ptys.killAll()
  app.quit()
})
