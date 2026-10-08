import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import type { Session } from '../shared/types'

// ~/.config/lymux/session.json
const sessionPath = (): string => join(app.getPath('userData'), 'session.json')

// Earlier names of the app (newest first): lynmux in v0.4.0, amux before that. Their sessions lived in ~/.config/<name>.
const LEGACY_NAMES = ['lynmux', 'amux']

async function readSession(file: string): Promise<Session | null> {
  try {
    const data = JSON.parse(await readFile(file, 'utf8'))
    return data?.version === 1 && Array.isArray(data.workspaces) && data.workspaces.length ? data : null
  } catch {
    return null
  }
}

/** Load the saved session, falling back once to a pre-rename session (it is saved to the new path on the next change). */
export async function loadSession(): Promise<Session | null> {
  const current = await readSession(sessionPath())
  if (current || process.env.LYMUX_USER_DATA) return current
  for (const name of LEGACY_NAMES) {
    const legacy = await readSession(join(app.getPath('appData'), name, 'session.json'))
    if (legacy) return legacy
  }
  return null
}

/** Atomic write: a crash mid-save never leaves a half-written session file. */
export async function saveSession(session: Session): Promise<void> {
  const file = sessionPath()
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  await writeFile(tmp, JSON.stringify(session, null, 2))
  await rename(tmp, file)
}
