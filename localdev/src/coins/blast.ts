import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const blastModule = createEvmCoinModule({
  id: 'blast',
  name: 'Blast',
  symbol: 'ETH',
  coinSymbol: 'ETH',
  chainId: 81457,
  bridgeCoinId: 'blast',
  logo: getUnifiedLogoByName('blast'),
  rpcEnvKey: 'VITE_BLAST_RPC',
  rpcUserEnvKey: 'VITE_BLAST_RPC_USER',
  rpcPasswordEnvKey: 'VITE_BLAST_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_BLAST_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_BLAST_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_BLAST_EXPLORER',
  defaultExplorerUrl: ''
})

export const BLAST_CAPABILITIES: NetworkCapabilitiesInput = blastModule.capabilities
export const createBlastNetwork: (ctx: CoinRuntimeContext) => Network = blastModule.createNetwork
export const blastCoin: CoinModule = blastModule.coin
