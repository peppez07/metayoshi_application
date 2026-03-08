export type StandardRuntimeMeta = {
  symbol: string
  coinId: string
}

export const STANDARD_RUNTIME_META: Record<string, StandardRuntimeMeta> = {
  rtm: { symbol: 'RTM', coinId: 'raptoreum' },
  'srv--bitcoin': { symbol: 'BTC', coinId: 'bitcoin' },
  dash: { symbol: 'DASH', coinId: 'dash' },
  btcz: { symbol: 'BTCZ', coinId: 'bitcoinz' },
  firo: { symbol: 'FIRO', coinId: 'firo' },
  cosmos: { symbol: 'ATOM', coinId: 'cosmos' },
  cro: { symbol: 'CRO', coinId: 'cronos-pos' },
  cronos: { symbol: 'CRO', coinId: 'cronos' },
  eth: { symbol: 'ETH', coinId: 'ethereum' },
  arb: { symbol: 'ETH', coinId: 'arbitrum-one' },
  op: { symbol: 'ETH', coinId: 'optimism' },
  base: { symbol: 'ETH', coinId: 'base' },
  polygon: { symbol: 'MATIC', coinId: 'polygon-bor' },
  avaxc: { symbol: 'AVAX', coinId: 'avalanche-c-chain' },
  sol: { symbol: 'SOL', coinId: 'solana' },
  sui: { symbol: 'SUI', coinId: 'sui' }
}
