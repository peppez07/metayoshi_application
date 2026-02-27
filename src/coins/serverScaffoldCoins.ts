import type { CoinModule } from './types'
import { cosmosCoin } from './cosmos'

const ALL_SERVER_SCAFFOLD_COIN_MODULES: CoinModule[] = [
  cosmosCoin
]

const ALL_SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID: Record<string, string> = {
  cosmos: 'srv--cosmos'
}

export const SERVER_SCAFFOLD_COIN_MODULES: CoinModule[] = [...ALL_SERVER_SCAFFOLD_COIN_MODULES]

export const SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID: Record<string, string> = {
  ...ALL_SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID
}
