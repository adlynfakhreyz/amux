import type { LymuxApi } from '../shared/types'

declare global {
  interface Window {
    lymux: LymuxApi
  }
}

export {}
