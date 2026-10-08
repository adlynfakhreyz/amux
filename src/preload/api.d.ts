import type { AmuxApi } from '../shared/types'

declare global {
  interface Window {
    amux: AmuxApi
  }
}

export {}
