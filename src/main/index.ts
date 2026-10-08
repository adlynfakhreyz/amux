import { join } from 'node:path'
import { homedir } from 'node:os'
import { writeFile } from 'node:fs/promises'
import { app, BrowserWindow, ipcMain } from 'electron'
import { PtyManager } from './pty'
import { loadSession, saveSession } from './session'
import { gitBranch } from './git'
import type { PaneMeta, Session, SpawnOptions } from '../shared/types'
import icon from '../../resources/icon.png?asset'

// AppImages cannot ship a setuid chrome-sandbox, and Ubuntu 24.04+ blocks the namespace sandbox for them.
// The .deb sets chrome-sandbox up properly, so only the AppImage opts out.
if (process.platform === 'linux' && process.env.APPIMAGE) app.commandLine.appendSwitch('no-sandbox')

let win: BrowserWindow | null = null
const ptys = new PtyManager(() => (win && !win.isDestroyed() ? win.webContents : null))

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'amux',
    backgroundColor: '#14161b',
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      additionalArguments: [`--amux-home=${homedir()}`],
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))

  // Dev aid: AMUX_SCREENSHOT=/path.png captures the window once the shells have drawn, then quits.
  const shot = process.env.AMUX_SCREENSHOT
  if (shot) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const image = await win?.webContents.capturePage()
        if (image) await writeFile(shot, image.toPNG())
        app.quit()
      }, Number(process.env.AMUX_SCREENSHOT_DELAY ?? 5000))
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

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  // v1: shells die with the app. A background daemon that keeps them alive is on the roadmap.
  ptys.killAll()
  app.quit()
})
