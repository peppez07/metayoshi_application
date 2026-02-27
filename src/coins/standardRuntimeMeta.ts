export type StandardRuntimeMeta = {
  symbol: string
  coinId: string
}

export const STANDARD_RUNTIME_META: Record<string, StandardRuntimeMeta> = {
  rtm: { symbol: 'RTM', coinId: 'raptoreum' },
  doge: { symbol: 'DOGE', coinId: 'dogecoin' },
  btcz: { symbol: 'BTCZ', coinId: 'bitcoinz' },
  tide: { symbol: 'TIDE', coinId: 'tidecoin' },
  firo: { symbol: 'FIRO', coinId: 'firo' },
  xrp: { symbol: 'XRP', coinId: 'xrp' },
  arr: { symbol: 'ARRR', coinId: 'arr' },
  xmr: { symbol: 'XMR', coinId: 'monero' },
  ada: { symbol: 'ADA', coinId: 'cardano' },
  eth: { symbol: 'ETH', coinId: 'ethereum' },
  arb: { symbol: 'ETH', coinId: 'arbitrum-one' },
  base: { symbol: 'ETH', coinId: 'base' },
  bnb: { symbol: 'BNB', coinId: 'bsc' },
  cro: { symbol: 'CRO', coinId: 'cronos' },
  polygon: { symbol: 'MATIC', coinId: 'polygon-bor' },
  avaxc: { symbol: 'AVAX', coinId: 'avalanche-c-chain' },
  sol: { symbol: 'SOL', coinId: 'solana' },
  xlm: { symbol: 'XLM', coinId: 'stellar' },
  tron: { symbol: 'TRX', coinId: 'tron' }
}
