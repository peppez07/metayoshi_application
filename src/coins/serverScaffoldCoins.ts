import type { CoinModule } from './types'
import { cosmosCoin } from './cosmos'
import { bitcoinCoin } from './bitcoin'
import { pivxCoin } from './pivx'
import { dashCoin } from './dash'
import { terraCoin } from './terra'
import { terraClassicCoin } from './terra-classic'
import { polkadotCoin } from './polkadot'
import { mantaAtlanticCoin } from './manta-atlantic'

const ALL_SERVER_SCAFFOLD_COIN_MODULES: CoinModule[] = [
  cosmosCoin,
  bitcoinCoin,
  pivxCoin,
  dashCoin,
  terraCoin,
  terraClassicCoin,
  polkadotCoin,
  mantaAtlanticCoin
]

const ALL_SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID: Record<string, string> = {
  cosmos: 'srv--cosmos',
  bitcoin: 'srv--bitcoin',
  pivx: 'srv--pivx',
  dash: 'srv--dash',
  terra: 'srv--terra',
  'terra-classic': 'srv--terra-classic',
  polkadot: 'srv--polkadot',
  'manta-atlantic': 'srv--manta-atlantic'
}

export const SERVER_SCAFFOLD_COIN_MODULES: CoinModule[] = [...ALL_SERVER_SCAFFOLD_COIN_MODULES]

export const SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID: Record<string, string> = {
  ...ALL_SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID
}
