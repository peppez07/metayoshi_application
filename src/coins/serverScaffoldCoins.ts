import type { CoinModule } from './types'
import { dashCoin } from './dash'

const ALL_SERVER_SCAFFOLD_COIN_MODULES: CoinModule[] = [
  dashCoin
]

const ALL_SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID: Record<string, string> = {
  dash: 'srv--dash'
}

export const SERVER_SCAFFOLD_COIN_MODULES: CoinModule[] = [...ALL_SERVER_SCAFFOLD_COIN_MODULES]

export const SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID: Record<string, string> = {
  ...ALL_SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID
}
