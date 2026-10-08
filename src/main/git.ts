import { execFile } from 'node:child_process'

/** Current git branch for a directory, or null when it is not inside a repo. */
export function gitBranch(cwd: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('git', ['-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD'], { timeout: 1500 }, (err, stdout) => {
      resolve(err ? null : stdout.trim() || null)
    })
  })
}
