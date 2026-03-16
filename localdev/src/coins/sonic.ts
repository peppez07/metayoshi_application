import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const sonicModule = createEvmCoinModule({
  id: 'sonic',
  name: 'Sonic',
  symbol: 'S',
  coinSymbol: 'S',
  chainId: 146,
  bridgeCoinId: 'sonic',
  logo: getUnifiedLogoByName('sonic'),
  rpcEnvKey: 'VITE_SONIC_RPC',
  rpcUserEnvKey: 'VITE_SONIC_RPC_USER',
  rpcPasswordEnvKey: 'VITE_SONIC_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_SONIC_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_SONIC_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_SONIC_EXPLORER',
  defaultExplorerUrl: 'https://sonicscan.org'
})

export const SONIC_CAPABILITIES: NetworkCapabilitiesInput = sonicModule.capabilities
export const createSonicNetwork: (ctx: CoinRuntimeContext) => Network = sonicModule.createNetwork
export const sonicCoin: CoinModule = sonicModule.coin
