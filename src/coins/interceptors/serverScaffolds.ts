import type { CoinApiInfo, CoinApiInterceptor } from './types'
import { bitcoinApiInterceptor, BITCOIN_API_INFO } from './bitcoin'
import { pivxApiInterceptor, PIVX_API_INFO } from './pivx'
import { dashApiInterceptor, DASH_API_INFO } from './dash'
import { terraApiInterceptor, TERRA_API_INFO } from './terra'
import { terraClassicApiInterceptor, TERRACLASSIC_API_INFO } from './terra-classic'
import { polkadotApiInterceptor, POLKADOT_API_INFO } from './polkadot'
import { mantaAtlanticApiInterceptor, MANTAATLANTIC_API_INFO } from './manta-atlantic'
import { cosmosApiInterceptor, COSMOS_API_INFO } from './cosmos'

export const SERVER_SCAFFOLD_API_INFO_BY_NETWORK_ID: Record<string, CoinApiInfo> = {
  'srv--cosmos': COSMOS_API_INFO,
  'srv--bitcoin': BITCOIN_API_INFO,
  'srv--pivx': PIVX_API_INFO,
  'srv--dash': DASH_API_INFO,
  'srv--terra': TERRA_API_INFO,
  'srv--terra-classic': TERRACLASSIC_API_INFO,
  'srv--polkadot': POLKADOT_API_INFO,
  'srv--manta-atlantic': MANTAATLANTIC_API_INFO
}

export const SERVER_SCAFFOLD_INTERCEPTOR_BY_NETWORK_ID: Record<string, CoinApiInterceptor> = {
  'srv--cosmos': cosmosApiInterceptor,
  'srv--bitcoin': bitcoinApiInterceptor,
  'srv--pivx': pivxApiInterceptor,
  'srv--dash': dashApiInterceptor,
  'srv--terra': terraApiInterceptor,
  'srv--terra-classic': terraClassicApiInterceptor,
  'srv--polkadot': polkadotApiInterceptor,
  'srv--manta-atlantic': mantaAtlanticApiInterceptor
}
