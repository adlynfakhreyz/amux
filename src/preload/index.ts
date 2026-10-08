import { contextBridge, ipcRenderer } from 'electron'
import type { AmuxApi } from '../shared/types'

function subscribe<T extends unknown[]>(channel: string, cb: (...args: T) => void): () => void {
  const listener = (_e: Electron.IpcRendererEvent, ...args: unknown[]): void => cb(...(args as T))
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

// The main process passes the home directory as a launch argument (the sandboxed preload has no node:os).
const homeArg = process.argv.find((a) => a.startsWith('--amux-home='))

const api: AmuxApi = {
  homeDir: homeArg ? homeArg.slice('--amux-home='.length) : '/',
  pty: {
    spawn: (id, opts) => ipcRenderer.invoke('pty:spawn', id, opts),
    write: (id, data) => ipcRenderer.send('pty:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.send('pty:resize', id, cols, rows),
    kill: (id) => ipcRenderer.send('pty:kill', id),
    onData: (cb) => subscribe('pty:data', cb),
    onExit: (cb) => subscribe('pty:exit', cb)
  },
  session: {
    load: () => ipcRenderer.invoke('session:load'),
    save: (session) => ipcRenderer.invoke('session:save', session)
  },
  meta: (ids) => ipcRenderer.invoke('meta:get', ids)
}

contextBridge.exposeInMainWorld('amux', api)
