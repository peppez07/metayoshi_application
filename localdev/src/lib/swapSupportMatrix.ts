type SwapAssetKind = 'native' | 'fungible'

export type SwapAssetSupport = {
  networkId: string
  assetId: string
  symbol: string
  label: string
  kind: SwapAssetKind
  contractAddress?: string
  aliases?: string[]
}

type SwapRouteEdge = {
  fromNetworkId: string
  fromSymbol: string
  toNetworkId: string
  toSymbol: string
}

const NETWORK_ASSET_SUPPORT: Record<string, SwapAssetSupport[]> = {
  sol: [
    {
      networkId: 'sol',
      assetId: 'native:solana',
      symbol: 'SOL',
      label: 'Solana',
      kind: 'native',
      aliases: ['native:sol', 'So11111111111111111111111111111111111111112']
    },
    {
      networkId: 'sol',
      assetId: 'spl:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      label: 'USD Coin',
      kind: 'fungible',
      contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    }
  ],
  eth: [
    {
      networkId: 'eth',
      assetId: 'native:eth',
      symbol: 'ETH',
      label: 'Ethereum',
      kind: 'native'
    },
    {
      networkId: 'eth',
      assetId: 'erc20:eth:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'USDC',
      label: 'USD Coin',
      kind: 'fungible',
      contractAddress: '0xA0b86991c6218b36c1d19d4a2e9eb0cE3606eB48'
    }
  ],
  base: [
    {
      networkId: 'base',
      assetId: 'erc20:base:0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      label: 'Wrapped Ether',
      kind: 'fungible',
      contractAddress: '0x4200000000000000000000000000000000000006',
      aliases: ['ETH', 'native:base']
    },
    {
      networkId: 'base',
      assetId: 'erc20:base:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      symbol: 'USDC',
      label: 'USD Coin',
      kind: 'fungible',
      contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    }
  ],
  arb: [
    {
      networkId: 'arb',
      assetId: 'erc20:arb:0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
      symbol: 'WETH',
      label: 'Wrapped Ether',
      kind: 'fungible',
      contractAddress: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
      aliases: ['ETH', 'native:arb']
    },
    {
      networkId: 'arb',
      assetId: 'erc20:arb:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      symbol: 'USDC',
      label: 'USD Coin',
      kind: 'fungible',
      contractAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    }
  ],
  op: [
    {
      networkId: 'op',
      assetId: 'erc20:op:0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      label: 'Wrapped Ether',
      kind: 'fungible',
      contractAddress: '0x4200000000000000000000000000000000000006',
      aliases: ['ETH', 'native:op']
    },
    {
      networkId: 'op',
      assetId: 'erc20:op:0x0b2c639c533813f4aa9d7837caf62653d097ff85',
      symbol: 'USDC',
      label: 'USD Coin',
      kind: 'fungible',
      contractAddress: '0x0b2c639c533813f4aa9d7837caf62653d097ff85'
    }
  ]
}

function normalizeNetworkId(value: unknown): string {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'solana') return 'sol'
  return normalized
}

function normalizeSymbol(value: unknown): string {
  return String(value || '').trim().toUpperCase()
}

function createBidirectionalRoute(
  leftNetworkId: string,
  leftSymbol: string,
  rightNetworkId: string,
  rightSymbol: string
): SwapRouteEdge[] {
  return [
    {
      fromNetworkId: normalizeNetworkId(leftNetworkId),
      fromSymbol: normalizeSymbol(leftSymbol),
      toNetworkId: normalizeNetworkId(rightNetworkId),
      toSymbol: normalizeSymbol(rightSymbol)
    },
    {
      fromNetworkId: normalizeNetworkId(rightNetworkId),
      fromSymbol: normalizeSymbol(rightSymbol),
      toNetworkId: normalizeNetworkId(leftNetworkId),
      toSymbol: normalizeSymbol(leftSymbol)
    }
  ]
}

const ACTIVE_SWAP_ROUTES: SwapRouteEdge[] = [
  ...createBidirectionalRoute('sol', 'SOL', 'sol', 'USDC'),
  ...createBidirectionalRoute('eth', 'ETH', 'eth', 'USDC'),
  ...createBidirectionalRoute('base', 'WETH', 'base', 'USDC'),
  ...createBidirectionalRoute('arb', 'WETH', 'arb', 'USDC'),
  ...createBidirectionalRoute('op', 'WETH', 'op', 'USDC'),
  ...createBidirectionalRoute('eth', 'ETH', 'base', 'WETH'),
  ...createBidirectionalRoute('eth', 'ETH', 'arb', 'WETH'),
  ...createBidirectionalRoute('eth', 'ETH', 'op', 'WETH'),
  ...createBidirectionalRoute('eth', 'USDC', 'base', 'USDC'),
  ...createBidirectionalRoute('eth', 'USDC', 'arb', 'USDC'),
  ...createBidirectionalRoute('eth', 'USDC', 'op', 'USDC')
]

export function isSwapMatrixSupportedNetworkId(networkId?: string | null): boolean {
  return Boolean(NETWORK_ASSET_SUPPORT[normalizeNetworkId(networkId)])
}

export function getSwapMatrixSupportedAssets(networkId?: string | null): SwapAssetSupport[] {
  return NETWORK_ASSET_SUPPORT[normalizeNetworkId(networkId)] || []
}

export function isSwapMatrixSupportedAsset(
  networkId: string | null | undefined,
  symbol: string | null | undefined,
  kind: SwapAssetKind
): boolean {
  const normalizedNetworkId = normalizeNetworkId(networkId)
  const normalizedSymbol = normalizeSymbol(symbol)
  return getSwapMatrixSupportedAssets(normalizedNetworkId).some((asset) => (
    asset.kind === kind && asset.symbol === normalizedSymbol
  ))
}

export function getSwapMatrixAllowedSourceSymbols(
  fromNetworkId?: string | null,
  toNetworkId?: string | null
): Set<string> {
  const normalizedFrom = normalizeNetworkId(fromNetworkId)
  const normalizedTo = normalizeNetworkId(toNetworkId)
  const out = new Set<string>()
  for (const route of ACTIVE_SWAP_ROUTES) {
    if (route.fromNetworkId === normalizedFrom && route.toNetworkId === normalizedTo) {
      out.add(route.fromSymbol)
    }
  }
  return out
}

export function getSwapMatrixAllowedDestinationSymbols(
  fromNetworkId?: string | null,
  toNetworkId?: string | null,
  fromSymbol?: string | null
): Set<string> {
  const normalizedFrom = normalizeNetworkId(fromNetworkId)
  const normalizedTo = normalizeNetworkId(toNetworkId)
  const normalizedFromSymbol = normalizeSymbol(fromSymbol)
  const out = new Set<string>()
  for (const route of ACTIVE_SWAP_ROUTES) {
    if (route.fromNetworkId !== normalizedFrom || route.toNetworkId !== normalizedTo) continue
    if (normalizedFromSymbol && route.fromSymbol !== normalizedFromSymbol) continue
    out.add(route.toSymbol)
  }
  return out
}

export function hasSwapMatrixRoute(
  fromNetworkId?: string | null,
  fromSymbol?: string | null,
  toNetworkId?: string | null,
  toSymbol?: string | null
): boolean {
  const normalizedFrom = normalizeNetworkId(fromNetworkId)
  const normalizedTo = normalizeNetworkId(toNetworkId)
  const normalizedFromSymbol = normalizeSymbol(fromSymbol)
  const normalizedToSymbol = normalizeSymbol(toSymbol)

  return ACTIVE_SWAP_ROUTES.some((route) => (
    route.fromNetworkId === normalizedFrom
    && route.toNetworkId === normalizedTo
    && (!normalizedFromSymbol || route.fromSymbol === normalizedFromSymbol)
    && (!normalizedToSymbol || route.toSymbol === normalizedToSymbol)
  ))
}
