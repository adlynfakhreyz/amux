import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import type { Session } from '../shared/types'

// ~/.config/amux/session.json
const sessionPath = (): string => join(app.getPath('userData'), 'session.json')

export async function loadSession(): Promise<Session | null> {
  try {
    const data = JSON.parse(await readFile(sessionPath(), 'utf8'))
    return data?.version === 1 && Array.isArray(data.workspaces) && data.workspaces.length ? data : null
  } catch {
    return null
  }
}

/** Atomic write: a crash mid-save never leaves a half-written session file. */
export async function saveSession(session: Session): Promise<void> {
  const file = sessionPath()
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  await writeFile(tmp, JSON.stringify(session, null, 2))
  await rename(tmp, file)
}
