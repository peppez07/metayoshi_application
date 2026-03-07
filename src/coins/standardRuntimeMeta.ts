export type StandardRuntimeMeta = {
  symbol: string
  coinId: string
}

export const STANDARD_RUNTIME_META: Record<string, StandardRuntimeMeta> = {
  rtm: { symbol: 'RTM', coinId: 'raptoreum' },
  dash: { symbol: 'DASH', coinId: 'dash' },
  btcz: { symbol: 'BTCZ', coinId: 'bitcoinz' },
  firo: { symbol: 'FIRO', coinId: 'firo' },
  cosmos: { symbol: 'ATOM', coinId: 'cosmos' },
  eth: { symbol: 'ETH', coinId: 'ethereum' },
  base: { symbol: 'ETH', coinId: 'base' },
  sol: { symbol: 'SOL', coinId: 'solana' }
}
