import type { LynmuxApi } from '../shared/types'

declare global {
  interface Window {
    lynmux: LynmuxApi
  }
}

export {}
