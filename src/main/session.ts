import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import type { Session } from '../shared/types'

// ~/.config/lynmux/session.json
const sessionPath = (): string => join(app.getPath('userData'), 'session.json')

// The app was called amux before v0.4.0; its session lived in ~/.config/amux.
const legacySessionPath = (): string => join(app.getPath('appData'), 'amux', 'session.json')

async function readSession(file: string): Promise<Session | null> {
  try {
    const data = JSON.parse(await readFile(file, 'utf8'))
    return data?.version === 1 && Array.isArray(data.workspaces) && data.workspaces.length ? data : null
  } catch {
    return null
  }
}

/** Load the saved session, falling back once to the pre-rename amux session (it is saved to the new path on the next change). */
export async function loadSession(): Promise<Session | null> {
  const current = await readSession(sessionPath())
  if (current || process.env.LYNMUX_USER_DATA) return current
  return readSession(legacySessionPath())
}

/** Atomic write: a crash mid-save never leaves a half-written session file. */
export async function saveSession(session: Session): Promise<void> {
  const file = sessionPath()
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  await writeFile(tmp, JSON.stringify(session, null, 2))
  await rename(tmp, file)
}
