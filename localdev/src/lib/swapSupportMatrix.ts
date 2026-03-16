type SwapAssetKind = 'native' | 'fungible'

type SwapAssetSupport = {
  symbol: string
  kind: SwapAssetKind
}

type SwapRouteEdge = {
  fromNetworkId: string
  fromSymbol: string
  toNetworkId: string
  toSymbol: string
}

const NETWORK_ASSET_SUPPORT: Record<string, SwapAssetSupport[]> = {
  sol: [
    { symbol: 'SOL', kind: 'native' },
    { symbol: 'USDC', kind: 'fungible' }
  ],
  eth: [
    { symbol: 'ETH', kind: 'native' },
    { symbol: 'USDC', kind: 'fungible' }
  ],
  base: [
    { symbol: 'WETH', kind: 'fungible' },
    { symbol: 'USDC', kind: 'fungible' }
  ],
  arb: [
    { symbol: 'WETH', kind: 'fungible' },
    { symbol: 'USDC', kind: 'fungible' }
  ],
  op: [
    { symbol: 'WETH', kind: 'fungible' },
    { symbol: 'USDC', kind: 'fungible' }
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
