import fs from 'fs';
import path from 'path';

const appRoot = process.cwd();
const srcRoot = path.join(appRoot, 'src');
const coinsRoot = path.join(srcRoot, 'coins');
const packedRegistryPath = path.join(coinsRoot, 'packed.ts');
const coinLogosRoot = path.join(srcRoot, 'coins', 'coinlogos');
const fallbackLogo = path.join(srcRoot, 'MetayoshiLogo.png');
const mappingReportPath = path.join(appRoot, 'reports', 'server-coin-mapping-report.md');
const activeCoinsPath = path.join('C:', 'Users', 'Giuseppe Grecu', 'metayoshi_SERVER', 'reports', 'active-coins-list.txt');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sanitizeId(input) {
  return String(input || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '');
}

function toTitle(id) {
  return String(id || '')
    .split(/[-_]/g)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function parseMappingReport(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const out = [];
  for (const line of raw.split(/\r?\n/g)) {
    const m = line.match(/^\-\s+([a-z0-9_-]+)\s+->\s+([a-z0-9_-]+)\s*$/i);
    if (!m) continue;
    out.push({
      coinId: sanitizeId(m[1]),
      runtimeModelId: sanitizeId(m[2]) || 'generic'
    });
  }
  return out;
}

function parseActiveCoins(filePath) {
  const map = new Map();
  if (!fs.existsSync(filePath)) return map;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/g)) {
    const t = line.trim();
    if (!t) continue;
    const parts = t.split(/\s+/g);
    if (parts.length < 3) continue;
    const coinId = sanitizeId(parts[0]);
    const symbol = String(parts[1] || '').trim().toUpperCase();
    const chains = String(parts[2] || 'main').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
    map.set(coinId, {
      symbol,
      chains: chains.length ? chains : ['main']
    });
  }
  return map;
}

function resolveSymbol(coinId, runtimeModelId, activeMeta) {
  const defaults = {
    rtm: 'RTM',
    bitcoin: 'BTC',
    doge: 'DOGE',
    btcz: 'BTCZ',
    tide: 'TIDE',
    firo: 'FIRO',
    xrp: 'XRP',
    arr: 'ARRR',
    xmr: 'XMR',
    ada: 'ADA',
    eth: 'ETH',
    arb: 'ETH',
    base: 'ETH',
    bnb: 'BNB',
    cro: 'CRO',
    polygon: 'MATIC',
    avaxc: 'AVAX',
    sol: 'SOL',
    xlm: 'XLM',
    tron: 'TRX'
  };
  const coinDefaults = {
    bitcoin: 'BTC',
    'bitcoin-testnet': 'BTC',
    dogecoin: 'DOGE',
    raptoreum: 'RTM',
    bitcoinz: 'BTCZ',
    tidecoin: 'TIDE',
    firo: 'FIRO',
    xrp: 'XRP',
    arr: 'ARRR',
    monero: 'XMR',
    cardano: 'ADA',
    stellar: 'XLM',
    solana: 'SOL',
    tron: 'TRX',
    ethereum: 'ETH'
  };
  const activeSymbol = String(activeMeta?.symbol || '').trim().toUpperCase();
  if (coinDefaults[coinId]) return coinDefaults[coinId];
  if (activeSymbol && activeSymbol.length <= 5) return activeSymbol;
  if (defaults[runtimeModelId]) return defaults[runtimeModelId];
  if (activeSymbol) return activeSymbol;
  return coinId.replace(/[^a-z0-9]/g, '').slice(0, 6).toUpperCase() || 'COIN';
}

function resolveRuntimeModelId(coinId, mappedRuntimeModelId) {
  const override = {
    raptoreum: 'rtm',
    dogecoin: 'doge',
    bitcoinz: 'btcz',
    tidecoin: 'tide',
    firo: 'firo',
    xrp: 'xrp',
    arr: 'arr',
    monero: 'xmr',
    cardano: 'ada',
    stellar: 'xlm',
    xlm: 'xlm',
    ethereum: 'eth',
    'arbitrum-one': 'arb',
    'arbitrum-nova': 'arb',
    base: 'base',
    bsc: 'bnb',
    'polygon-bor': 'polygon',
    'avalanche-c-chain': 'avaxc',
    solana: 'sol',
    tron: 'tron',
    bitcoin: 'bitcoin',
    'bitcoin-testnet': 'bitcoin'
  };
  return override[coinId] || mappedRuntimeModelId || 'generic';
}

function resolveCoinType(runtimeModelId) {
  if (['eth', 'arb', 'base', 'bnb', 'cro', 'polygon', 'avaxc'].includes(runtimeModelId)) return 'EVM';
  if (runtimeModelId === 'sol') return 'SOL';
  if (runtimeModelId === 'tron') return 'TRON';
  if (runtimeModelId === 'xrp') return 'XRP';
  if (runtimeModelId === 'xlm') return 'XLM';
  if (runtimeModelId === 'ada') return 'ADA';
  if (runtimeModelId === 'xmr') return 'XMR';
  return 'UTXO';
}

function resolveRpcModel(coinType) {
  if (coinType === 'EVM') return 'evm';
  if (coinType === 'UTXO') return 'utxo';
  return 'rpc';
}

function resolveLayerProfile(coinId, runtimeModelId, coinType) {
  const id = String(coinId || '').trim().toLowerCase();
  const model = String(runtimeModelId || '').trim().toLowerCase();

  const l2ByCoinId = {
    'arbitrum-one': { parent: 'ethereum' },
    'arbitrum-nova': { parent: 'ethereum' },
    'base': { parent: 'ethereum' },
    'base-sepolia': { parent: 'ethereum' },
    'blast': { parent: 'ethereum' },
    'linea': { parent: 'ethereum' },
    'linea-sepolia': { parent: 'ethereum' },
    'optimism': { parent: 'ethereum' },
    'optimism-sepolia': { parent: 'ethereum' },
    'scroll': { parent: 'ethereum' },
    'scroll-sepolia': { parent: 'ethereum' },
    'taiko': { parent: 'ethereum' },
    'taiko-hoodi': { parent: 'ethereum' },
    'unichain': { parent: 'ethereum' },
    'unichain-sepolia': { parent: 'ethereum' },
    'zksync': { parent: 'ethereum' },
    'fraxtal': { parent: 'ethereum' },
    'fraxtal-hoodi': { parent: 'ethereum' },
    'metis': { parent: 'ethereum' },
    'metis-sepolia': { parent: 'ethereum' },
    'mantle': { parent: 'ethereum' },
    'soneium': { parent: 'ethereum' },
    'soneium-minato': { parent: 'ethereum' },
    'sonic': { parent: 'ethereum' },
    'sonic-blaze': { parent: 'ethereum' },
    'berachain': { parent: 'ethereum' },
    'berachain-beacon': { parent: 'ethereum' },
    'opbnb': { parent: 'bsc' },
    'opbnb-testnet': { parent: 'bsc' },
    'polygon-amoy-bor': { parent: 'polygon' },
    'polygon-amoy-heimdall': { parent: 'polygon' }
  };

  if (l2ByCoinId[id]) {
    return {
      layer: 'L2',
      parentBlockchain: l2ByCoinId[id].parent,
      layer2RollupType: 'unknown',
      layer3Parent: ''
    };
  }

  // Heuristic: forced EVM compatibility networks are most often L2/L3 style app mappings.
  if (coinType === 'EVM' && (id.endsWith('-evm') || id.includes('sepolia') || id.includes('testnet'))) {
    return {
      layer: 'L2',
      parentBlockchain: model === 'bnb' ? 'bsc' : 'ethereum',
      layer2RollupType: 'unknown',
      layer3Parent: ''
    };
  }

  return {
    layer: 'L1',
    parentBlockchain: '',
    layer2RollupType: '',
    layer3Parent: ''
  };
}

function isEvmModel(runtimeModelId) {
  return resolveCoinType(runtimeModelId) === 'EVM';
}

function inferBridgeCoinId(coinId) {
  if (coinId === 'polygon') return 'polygon-bor';
  if (coinId === 'avaxc') return 'avalanche-c-chain';
  if (coinId === 'bnb') return 'bsc';
  if (coinId === 'eth') return 'ethereum';
  if (coinId === 'arb') return 'arbitrum-one';
  return coinId;
}

function pickLogo(coinId, runtimeModelId) {
  const list = fs.readdirSync(coinLogosRoot);
  const lowerToFile = new Map(list.map((f) => [f.toLowerCase(), f]));

  const directCandidates = [
    `${coinId}.png`, `${coinId}.webp`, `${coinId}.jpg`, `${coinId}.jpeg`,
    `${coinId.replace(/-/g, ' ')}.png`, `${coinId.replace(/-/g, ' ')}.webp`
  ];
  for (const candidate of directCandidates) {
    const hit = lowerToFile.get(candidate.toLowerCase());
    if (hit) return path.join(coinLogosRoot, hit);
  }

  const modelFiles = {
    eth: ['ethereum.png', 'ethereum.webp'],
    arb: ['arbitrum.png', 'arb.jpg'],
    base: ['base.png'],
    bnb: ['bnb.png', 'bnb.webp'],
    cro: ['cronos.png', 'cro.png'],
    polygon: ['polygon.png'],
    avaxc: ['avalanche.png', 'avalanche.webp', 'Avalanche.webp'],
    sol: ['solana.png', 'solana.webp'],
    xlm: ['stellar.png', 'xlm.png'],
    tron: ['tron.png', 'tron.webp', 'trx.png'],
    xrp: ['xrp.png', 'xrp.webp'],
    xmr: ['monero.png', 'monero.webp'],
    ada: ['cardano.png', 'cardano.webp'],
    rtm: ['raptoreum.png', 'rtm.webp'],
    doge: ['dogecoin.png', 'doge.webp'],
    btcz: ['bitcoinz.png', 'btcz.webp'],
    tide: ['tide.webp'],
    firo: ['firo.png', 'firo.webp'],
    arr: ['pirate-chain.png', 'Pirate_Chain.webp']
  };

  for (const f of modelFiles[runtimeModelId] || []) {
    const hit = lowerToFile.get(f.toLowerCase());
    if (hit) return path.join(coinLogosRoot, hit);
  }

  return fallbackLogo;
}

function resolveDecimals(symbol, runtimeModelId, coinType) {
  if (symbol === 'XRP') return 6;
  if (symbol === 'XLM') return 7;
  if (symbol === 'ADA') return 6;
  if (symbol === 'XMR') return 12;
  if (coinType === 'EVM') return 18;
  if (runtimeModelId === 'sol') return 9;
  return 8;
}

const EVM_CHAIN_METADATA_BY_COIN_ID = {
  ethereum: { chainId: 1, testnetChainId: 11155111, chainSlug: 'ethereum', explorerBaseUrl: 'https://etherscan.io', source: 'chainlist' },
  sepolia: { chainId: 11155111, testnetChainId: null, chainSlug: 'sepolia', explorerBaseUrl: 'https://sepolia.etherscan.io', source: 'chainlist' },
  bsc: { chainId: 56, testnetChainId: 97, chainSlug: 'binance', explorerBaseUrl: 'https://bscscan.com', source: 'chainlist' },
  'bsc-testnet': { chainId: 97, testnetChainId: null, chainSlug: 'bsc-testnet', explorerBaseUrl: 'https://testnet.bscscan.com', source: 'chainlist' },
  base: { chainId: 8453, testnetChainId: 84532, chainSlug: 'base', explorerBaseUrl: 'https://basescan.org', source: 'chainlist' },
  'base-sepolia': { chainId: 84532, testnetChainId: null, chainSlug: 'base-sepolia', explorerBaseUrl: 'https://sepolia.basescan.org', source: 'chainlist' },
  'arbitrum-one': { chainId: 42161, testnetChainId: 421614, chainSlug: 'arbitrum', explorerBaseUrl: 'https://arbiscan.io', source: 'chainlist' },
  'arbitrum-nova': { chainId: 42170, testnetChainId: null, chainSlug: 'arbitrum-nova', explorerBaseUrl: 'https://nova.arbiscan.io', source: 'chainlist' },
  polygon: { chainId: 137, testnetChainId: 80002, chainSlug: 'polygon', explorerBaseUrl: 'https://polygonscan.com', source: 'chainlist' },
  'polygon-bor': { chainId: 137, testnetChainId: 80002, chainSlug: 'polygon', explorerBaseUrl: 'https://polygonscan.com', source: 'chainlist' },
  'polygon-amoy-bor': { chainId: 80002, testnetChainId: null, chainSlug: 'polygon-amoy', explorerBaseUrl: 'https://amoy.polygonscan.com', source: 'chainlist' },
  avaxc: { chainId: 43114, testnetChainId: 43113, chainSlug: 'avalanche', explorerBaseUrl: 'https://snowtrace.io', source: 'chainlist' },
  'avalanche-c-chain': { chainId: 43114, testnetChainId: 43113, chainSlug: 'avalanche', explorerBaseUrl: 'https://snowtrace.io', source: 'chainlist' },
  'avalanche-fuji-c-chain': { chainId: 43113, testnetChainId: null, chainSlug: 'avalanche-fuji', explorerBaseUrl: 'https://testnet.snowtrace.io', source: 'chainlist' },
  optimism: { chainId: 10, testnetChainId: 11155420, chainSlug: 'optimism', explorerBaseUrl: 'https://optimistic.etherscan.io', source: 'chainlist' },
  'optimism-sepolia': { chainId: 11155420, testnetChainId: null, chainSlug: 'optimism-sepolia', explorerBaseUrl: 'https://sepolia-optimism.etherscan.io', source: 'chainlist' },
  blast: { chainId: 81457, testnetChainId: 168587773, chainSlug: 'blast', explorerBaseUrl: 'https://blastscan.io', source: 'chainlist' },
  linea: { chainId: 59144, testnetChainId: 59141, chainSlug: 'linea', explorerBaseUrl: 'https://lineascan.build', source: 'chainlist' },
  'linea-sepolia': { chainId: 59141, testnetChainId: null, chainSlug: 'linea-sepolia', explorerBaseUrl: 'https://sepolia.lineascan.build', source: 'chainlist' },
  scroll: { chainId: 534352, testnetChainId: 534351, chainSlug: 'scroll', explorerBaseUrl: 'https://scrollscan.com', source: 'chainlist' },
  'scroll-sepolia': { chainId: 534351, testnetChainId: null, chainSlug: 'scroll-sepolia', explorerBaseUrl: 'https://sepolia.scrollscan.com', source: 'chainlist' },
  zksync: { chainId: 324, testnetChainId: 300, chainSlug: 'zksync-era', explorerBaseUrl: 'https://explorer.zksync.io', source: 'chainlist' },
  fraxtal: { chainId: 252, testnetChainId: null, chainSlug: 'fraxtal', explorerBaseUrl: 'https://fraxscan.com', source: 'chainlist' },
  mantle: { chainId: 5000, testnetChainId: 5003, chainSlug: 'mantle', explorerBaseUrl: 'https://explorer.mantle.xyz', source: 'chainlist' },
  metis: { chainId: 1088, testnetChainId: 59902, chainSlug: 'metis', explorerBaseUrl: 'https://explorer.metis.io', source: 'chainlist' },
  sonic: { chainId: 146, testnetChainId: 57054, chainSlug: 'sonic', explorerBaseUrl: 'https://sonicscan.org', source: 'chainlist' },
  berachain: { chainId: 80094, testnetChainId: 80069, chainSlug: 'berachain', explorerBaseUrl: 'https://berascan.com', source: 'chainlist' },
  unichain: { chainId: 130, testnetChainId: 1301, chainSlug: 'unichain', explorerBaseUrl: 'https://uniscan.xyz', source: 'chainlist' }
};

const MODEL_DEFAULT_EVM_CHAIN_METADATA = {
  eth: { chainId: 1, testnetChainId: 11155111, chainSlug: 'ethereum', explorerBaseUrl: 'https://etherscan.io', source: 'model-default' },
  arb: { chainId: 42161, testnetChainId: 421614, chainSlug: 'arbitrum', explorerBaseUrl: 'https://arbiscan.io', source: 'model-default' },
  base: { chainId: 8453, testnetChainId: 84532, chainSlug: 'base', explorerBaseUrl: 'https://basescan.org', source: 'model-default' },
  bnb: { chainId: 56, testnetChainId: 97, chainSlug: 'binance', explorerBaseUrl: 'https://bscscan.com', source: 'model-default' },
  cro: { chainId: 25, testnetChainId: 338, chainSlug: 'cronos', explorerBaseUrl: 'https://cronoscan.com', source: 'model-default' },
  polygon: { chainId: 137, testnetChainId: 80002, chainSlug: 'polygon', explorerBaseUrl: 'https://polygonscan.com', source: 'model-default' },
  avaxc: { chainId: 43114, testnetChainId: 43113, chainSlug: 'avalanche', explorerBaseUrl: 'https://snowtrace.io', source: 'model-default' }
};

function resolveChainMetadata(coinId, runtimeModelId, coinType, chains) {
  const id = String(coinId || '').trim().toLowerCase();
  const model = String(runtimeModelId || '').trim().toLowerCase();
  const allChains = Array.isArray(chains) ? chains : ['main'];
  const hasTestnet = allChains.includes('test');

  if (coinType === 'EVM') {
    const found = EVM_CHAIN_METADATA_BY_COIN_ID[id] || MODEL_DEFAULT_EVM_CHAIN_METADATA[model] || null;
    const chainId = found?.chainId ?? null;
    const testnetChainId = hasTestnet ? (found?.testnetChainId ?? null) : null;
    return {
      type: 'EVM',
      family: 'eip155',
      chainId,
      testnetChainId,
      chainSlug: found?.chainSlug || id,
      source: found?.source || 'unknown',
      isRpc: true,
      isUtxo: false
    };
  }

  if (coinType === 'UTXO') {
    return {
      type: 'UTXO',
      family: 'utxo',
      chainId: null,
      testnetChainId: null,
      chainSlug: id,
      source: 'n/a',
      isRpc: true,
      isUtxo: true
    };
  }

  return {
    type: coinType,
    family: 'account-based',
    chainId: null,
    testnetChainId: null,
    chainSlug: id,
    source: 'n/a',
    isRpc: true,
    isUtxo: false
  };
}

function resolveRpcPolicy(coinType) {
  return {
    mode: 'server-dispatcher',
    appDirectRpcEnabled: false,
    serverDispatchRequired: true,
    supportsRead: true,
    supportsWrite: true,
    supportsSubscriptions: coinType === 'EVM',
    txPendingMethod: coinType === 'EVM' ? 'eth_getTransactionByHash' : 'getrawtransaction',
    txDetailsMethod: coinType === 'EVM' ? 'eth_getTransactionReceipt' : 'gettransaction',
    healthMethod: coinType === 'EVM' ? 'eth_blockNumber' : 'getblockcount'
  };
}

function resolveExplorer(coinId, runtimeModelId, coinType, chainMeta) {
  const model = String(runtimeModelId || '').trim().toLowerCase();
  const id = String(coinId || '').trim().toLowerCase();
  const evmBase = chainMeta?.type === 'EVM'
    ? String(EVM_CHAIN_METADATA_BY_COIN_ID[id]?.explorerBaseUrl || MODEL_DEFAULT_EVM_CHAIN_METADATA[model]?.explorerBaseUrl || '').trim()
    : '';

  const byModel = {
    bitcoin: 'https://mempool.space',
    doge: 'https://dogechain.info',
    btcz: 'https://explorer.btcz.rocks',
    rtm: 'https://explorer.raptoreum.com',
    tide: 'https://explorer.tidecoin.io',
    firo: 'https://explorer.firo.org',
    arr: 'https://explorer.pirate.black',
    xmr: 'https://xmrchain.net',
    ada: 'https://cardanoscan.io',
    xrp: 'https://xrpscan.com',
    xlm: 'https://stellar.expert/explorer/public',
    sol: 'https://solscan.io',
    tron: 'https://tronscan.org'
  };

  const baseUrl = evmBase || byModel[model] || '';
  const normalizedBase = String(baseUrl || '').trim().replace(/\/+$/, '');
  const isEvm = coinType === 'EVM';

  const txPath = isEvm ? '/tx/{txid}' : '/tx/{txid}';
  const addressPath = isEvm ? '/address/{address}' : '/address/{address}';
  const blockPath = isEvm ? '/block/{block}' : '/block/{block}';

  return {
    provider: normalizedBase ? (isEvm ? 'eip3091-compatible' : 'chain-native') : 'unknown',
    baseUrl: normalizedBase,
    txUrlTemplate: normalizedBase ? `${normalizedBase}${txPath}` : '',
    addressUrlTemplate: normalizedBase ? `${normalizedBase}${addressPath}` : '',
    blockUrlTemplate: normalizedBase ? `${normalizedBase}${blockPath}` : '',
    supportsPendingTx: isEvm || coinType === 'UTXO'
  };
}

function resolveStatusConfig() {
  return {
    enabled: true,
    source: 'server',
    healthPath: '/v1/health',
    statusPath: '/v1/status',
    pollIntervalMs: 6000,
    staleAfterMs: 30000,
    failAfterConsecutiveErrors: 3
  };
}

function resolveTokenStandards(coinType, runtimeModelId) {
  const isEvm = coinType === 'EVM';
  const isSol = coinType === 'SOL' || String(runtimeModelId || '').trim().toLowerCase() === 'sol';

  const evmAccepted = isEvm
    ? ['ERC-20', 'ERC-721', 'ERC-1155', 'ERC-4626', 'ERC-777', 'ERC-1363']
    : [];

  const solAccepted = isSol
    ? ['SPL', 'SPL-NFT', 'SPL-CNFT']
    : [];

  return {
    evm: {
      enabled: isEvm,
      accepted: evmAccepted,
      fungible: isEvm ? ['ERC-20', 'ERC-4626', 'ERC-777', 'ERC-1363'] : [],
      nft: isEvm ? ['ERC-721', 'ERC-1155'] : [],
      notes: isEvm
        ? 'ERC-4626/777/1363 are treated as ERC-20-compatible for transfer/balance flows.'
        : ''
    },
    solana: {
      enabled: isSol,
      accepted: solAccepted,
      fungible: isSol ? ['SPL'] : [],
      nft: isSol ? ['SPL-NFT', 'SPL-CNFT'] : [],
      notes: isSol
        ? 'SPL fungible tokens, SPL NFTs, and compressed NFTs are accepted.'
        : ''
    }
  };
}

function featureFileContent(input) {
  const chainLayer = resolveLayerProfile(input.coinId, input.runtimeModelId, input.coinType);
  const rpcModel = resolveRpcModel(input.coinType);
  const defaultChain = input.chains.includes('test') && !input.chains.includes('main') ? 'test' : 'main';
  const supportedChains = [
    ...(input.chains.includes('main') ? ['main'] : []),
    ...(input.chains.includes('test') ? ['test'] : [])
  ];
  const isEvm = isEvmModel(input.runtimeModelId);
  const balanceMethod = isEvm ? 'eth_getBalance' : 'getbalance';
  const chainMeta = resolveChainMetadata(input.coinId, input.runtimeModelId, input.coinType, input.chains);
  const rpcPolicy = resolveRpcPolicy(input.coinType);
  const explorer = resolveExplorer(input.coinId, input.runtimeModelId, input.coinType, chainMeta);
  const statusConfig = resolveStatusConfig();
  const tokenStandards = resolveTokenStandards(input.coinType, input.runtimeModelId);
  const settings = {
    identity: {
      networkId: input.networkId,
      coinId: input.coinId,
      bridgeCoinId: input.bridgeCoinId,
      runtimeModelId: input.runtimeModelId,
      name: input.name,
      symbol: input.symbol,
      coinType: input.coinType,
      decimals: input.decimals,
      enabled: true,
      testnetEnabled: input.chains.includes('test')
    },
    chainConfiguration: {
      rpcModel,
      coinType: input.coinType,
      runtimeModelId: input.runtimeModelId,
      layer: chainLayer.layer,
      parentBlockchain: chainLayer.parentBlockchain,
      layer2RollupType: chainLayer.layer2RollupType,
      layer3Parent: chainLayer.layer3Parent,
      isLayer1: chainLayer.layer === 'L1',
      isLayer2: chainLayer.layer === 'L2',
      isLayer3: chainLayer.layer === 'L3'
    },
    chain: chainMeta,
    rpc: {
      protocol: input.coinType === 'EVM' ? 'jsonrpc-evm' : 'jsonrpc',
      timeoutMs: 20000,
      retryMax: 2,
      retryBackoffMs: 300,
      allowInsecureHttp: false,
      keepAlive: true,
      maxConcurrent: 16,
      headers: {},
      auth: {
        username: '',
        password: '',
        token: '',
        useBasicAuth: true
      }
    },
    rpcPolicy,
    bridge: {
      chain: defaultChain,
      supportedChains,
      strictRoute: true,
      walletScopedPath: input.coinType !== 'XMR' && input.coinType !== 'ADA' && input.coinType !== 'XRP',
      secureAuth: {
        enabled: true,
        requireOpToken: true,
        opTokenTtlSec: 60
      },
      rateLimit: {
        enabled: true,
        maxRequestsPerMinute: 120,
        maxWriteRequestsPerMinute: 20
      }
    },
    fees: {
      enabled: true,
      mode: input.coinType === 'EVM' ? 'eip1559' : 'fixed-per-byte',
      feePerByte: input.coinType === 'UTXO' ? 0.00001 : 0,
      gasLimitDefault: input.coinType === 'EVM' ? 21000 : 0,
      maxFeePerGasGwei: input.coinType === 'EVM' ? 80 : 0,
      maxPriorityFeePerGasGwei: input.coinType === 'EVM' ? 2 : 0
    },
    capabilities: {
      nativeSend: true,
      assetLayer: input.coinType === 'EVM' || input.coinId === 'raptoreum' || input.coinType === 'SOL',
      assetSend: input.coinType === 'EVM' || input.coinId === 'raptoreum' || input.coinType === 'SOL',
      nft: input.coinType === 'EVM' || input.coinType === 'SOL',
      staking: false,
      swap: false,
      bridgeReads: true,
      bridgeWrites: true
    },
    ui: {
      showAssetsTab: true,
      showAssetsAction: true,
      showSendAction: true,
      showActivityTab: true,
      showModelAction: true,
      assetListLayout: input.coinType === 'EVM' ? 'flat' : 'grouped',
      hideAssetMetaLabels: input.coinType === 'EVM',
      showAssetPreview: input.coinType === 'UTXO' || input.coinType === 'EVM' || input.coinType === 'XRP' || input.runtimeModelId === 'sol' || input.runtimeModelId === 'ada' || input.runtimeModelId === 'tron',
      wallet: {
        showModelAction: true,
        assetListLayout: input.coinType === 'EVM' ? 'flat' : 'grouped',
        hideAssetMetaLabels: input.coinType === 'EVM',
        showAssetPreview: input.coinType === 'UTXO' || input.coinType === 'EVM' || input.coinType === 'XRP' || input.runtimeModelId === 'sol' || input.runtimeModelId === 'ada' || input.runtimeModelId === 'tron'
      },
      color: {
        primary: '#2bd3ff',
        accent: '#1e90ff'
      }
    },
    security: {
      nonCustodialOnly: true,
      blockSensitivePayloadKeys: true,
      blockedMethods: [
        'importprivkey',
        'dumpprivkey',
        'importwallet',
        'dumpwallet',
        'walletpassphrase',
        'walletpassphrasechange'
      ],
      requireAddressValidation: true,
      requireAmountValidation: true
    },
    sync: {
      autoRefreshMs: 30000,
      healthCheckMs: 6000,
      watchdogEnabled: true,
      cacheTtlMs: 1500
    },
    explorer,
    status: statusConfig,
    tokenStandards,
    custom: {
      envPrefix: String(input.symbol || input.coinId).toUpperCase(),
      notes: 'All settings are editable at runtime by the application if needed.'
    }
  };

  const settingsJson = JSON.stringify(settings, null, 2);
  const identityJson = JSON.stringify({
    networkId: input.networkId,
    coinId: input.coinId,
    bridgeCoinId: input.bridgeCoinId,
    runtimeModelId: input.runtimeModelId,
    name: input.name,
    symbol: input.symbol,
    coinType: input.coinType,
    decimals: input.decimals,
    logoPath: `./${input.coinId}${input.logoExt}`
  }, null, 2);

  return `/**
 * AUTO-GENERATED PACKED COIN FEATURE (FIXED)
 * - One file per coin with duplicated logic by design.
 * - Includes settings, payload builders, interceptors, and defaults.
 *
 * Fixes applied:
 * - Single source of truth for identity
 * - Stronger typing via \`satisfies\`
 * - Interceptor config flags are actually enforced
 * - blockedMethods list is enforced
 * - Sensitive key scan is recursive (nested objects)
 * - Chain type is explicit and used everywhere
 */

export type Chain = 'main' | 'test'

export type PackedCoinFeature = {
  networkId: string
  coinId: string
  bridgeCoinId: string
  runtimeModelId: string
  name: string
  symbol: string
  coinType: string
  decimals: number
  logoPath: string
  settings: Record<string, any>
  payloadTemplates: Record<string, any>
  interceptorConfig: Record<string, any>
}

const IDENTITY = ${identityJson} as const

const {
  networkId: NETWORK_ID,
  coinId: COIN_ID,
  bridgeCoinId: BRIDGE_COIN_ID,
  runtimeModelId: RUNTIME_MODEL_ID,
  name: COIN_NAME,
  symbol: COIN_SYMBOL,
  coinType: COIN_TYPE,
  decimals: COIN_DECIMALS,
  logoPath: LOGO_PATH
} = IDENTITY

type CoinSettings = {
  identity: {
    networkId: string
    coinId: string
    bridgeCoinId: string
    runtimeModelId: string
    name: string
    symbol: string
    coinType: string
    decimals: number
    enabled: boolean
    testnetEnabled: boolean
  }
  chainConfiguration: {
    rpcModel: string
    coinType: string
    runtimeModelId: string
    layer: 'L1' | 'L2' | 'L3' | string
    parentBlockchain: string
    layer2RollupType: string
    layer3Parent: string
    isLayer1: boolean
    isLayer2: boolean
    isLayer3: boolean
  }
  chain: {
    type: string
    family: string
    chainId: number | null
    testnetChainId: number | null
    chainSlug: string
    source: string
    isRpc: boolean
    isUtxo: boolean
  }
  rpc: {
    protocol: string
    timeoutMs: number
    retryMax: number
    retryBackoffMs: number
    allowInsecureHttp: boolean
    keepAlive: boolean
    maxConcurrent: number
    headers: Record<string, string>
    auth: {
      username: string
      password: string
      token: string
      useBasicAuth: boolean
    }
  }
  rpcPolicy: {
    mode: string
    appDirectRpcEnabled: boolean
    serverDispatchRequired: boolean
    supportsRead: boolean
    supportsWrite: boolean
    supportsSubscriptions: boolean
    txPendingMethod: string
    txDetailsMethod: string
    healthMethod: string
  }
  bridge: {
    chain: Chain
    supportedChains: Chain[]
    strictRoute: boolean
    walletScopedPath: boolean
    secureAuth: { enabled: boolean; requireOpToken: boolean; opTokenTtlSec: number }
    rateLimit: { enabled: boolean; maxRequestsPerMinute: number; maxWriteRequestsPerMinute: number }
  }
  fees: {
    enabled: boolean
    mode: string
    feePerByte: number
    gasLimitDefault: number
    maxFeePerGasGwei: number
    maxPriorityFeePerGasGwei: number
  }
  capabilities: {
    nativeSend: boolean
    assetLayer: boolean
    assetSend: boolean
    nft: boolean
    staking: boolean
    swap: boolean
    bridgeReads: boolean
    bridgeWrites: boolean
  }
  ui: {
    showAssetsTab: boolean
    showAssetsAction: boolean
    showSendAction: boolean
    showActivityTab: boolean
    showModelAction: boolean
    assetListLayout: string
    hideAssetMetaLabels: boolean
    showAssetPreview: boolean
    wallet: {
      showModelAction: boolean
      assetListLayout: string
      hideAssetMetaLabels: boolean
      showAssetPreview: boolean
    }
    color: { primary: string; accent: string }
  }
  security: {
    nonCustodialOnly: boolean
    blockSensitivePayloadKeys: boolean
    blockedMethods: string[]
    requireAddressValidation: boolean
    requireAmountValidation: boolean
  }
  sync: {
    autoRefreshMs: number
    healthCheckMs: number
    watchdogEnabled: boolean
    cacheTtlMs: number
  }
  explorer: {
    provider: string
    baseUrl: string
    txUrlTemplate: string
    addressUrlTemplate: string
    blockUrlTemplate: string
    supportsPendingTx: boolean
  }
  status: {
    enabled: boolean
    source: string
    healthPath: string
    statusPath: string
    pollIntervalMs: number
    staleAfterMs: number
    failAfterConsecutiveErrors: number
  }
  tokenStandards: {
    evm: {
      enabled: boolean
      accepted: string[]
      fungible: string[]
      nft: string[]
      notes: string
    }
    solana: {
      enabled: boolean
      accepted: string[]
      fungible: string[]
      nft: string[]
      notes: string
    }
  }
  custom: {
    envPrefix: string
    notes: string
  }
}

const SETTINGS = ${settingsJson} satisfies CoinSettings

const COMMON_FEATURES = {
  nativeSend: SETTINGS.capabilities.nativeSend,
  assetLayer: SETTINGS.capabilities.assetLayer,
  assetSend: SETTINGS.capabilities.assetSend,
  nft: SETTINGS.capabilities.nft,
  bridgeReads: SETTINGS.capabilities.bridgeReads,
  bridgeWrites: SETTINGS.capabilities.bridgeWrites
} as const

/**
 * Token standards accepted by this coin feature.
 * EVM: ERC-20, ERC-721, ERC-1155, ERC-4626, ERC-777, ERC-1363
 * Solana: SPL, SPL-NFT, SPL-CNFT (compressed NFT)
 */
const ACCEPTED_TOKEN_STANDARDS = {
  evm: [...SETTINGS.tokenStandards.evm.accepted],
  solana: [...SETTINGS.tokenStandards.solana.accepted]
} as const

function normalizeTokenStandard(value: string): string {
  const raw = String(value ?? '').trim().toUpperCase().replace(/_/g, '-')
  if (!raw) return ''
  if (raw === 'ERC20') return 'ERC-20'
  if (raw === 'ERC721') return 'ERC-721'
  if (raw === 'ERC1155') return 'ERC-1155'
  if (raw === 'ERC4626') return 'ERC-4626'
  if (raw === 'ERC777') return 'ERC-777'
  if (raw === 'ERC1363') return 'ERC-1363'
  if (raw === 'SPLTOKEN' || raw === 'SPL-TOKEN') return 'SPL'
  if (raw === 'SPLNFT' || raw === 'SPL-NFT') return 'SPL-NFT'
  if (raw === 'CNFT' || raw === 'SPL-CNFT' || raw === 'COMPRESSED-NFT') return 'SPL-CNFT'
  return raw
}

export function listAcceptedTokenStandards() {
  return {
    evm: [...ACCEPTED_TOKEN_STANDARDS.evm],
    solana: [...ACCEPTED_TOKEN_STANDARDS.solana]
  }
}

export function isTokenStandardAccepted(standard: string): boolean {
  const normalized = normalizeTokenStandard(standard)
  if (!normalized) return false
  const evmAccepted: string[] = [...ACCEPTED_TOKEN_STANDARDS.evm]
  const solAccepted: string[] = [...ACCEPTED_TOKEN_STANDARDS.solana]
  return (
    evmAccepted.includes(normalized)
    || solAccepted.includes(normalized)
  )
}

function normalizeChain(chain?: string): Chain {
  const c = String(chain ?? '').trim().toLowerCase()
  if (c === 'test' || c === 'testnet') return 'test'
  return 'main'
}

export function buildJsonRpcPayload(
  method: string,
  params: any[] = [],
  id: string | number | null = 'metayoshi'
) {
  return {
    jsonrpc: '2.0',
    id,
    method: String(method ?? '').trim(),
    params: Array.isArray(params) ? params : []
  }
}

export function buildBridgePayload(input: {
  method: string
  params?: any[]
  id?: string | number | null
  chain?: Chain | string
}) {
  const chain = normalizeChain(String(input.chain ?? SETTINGS.bridge.chain))
  return {
    networkId: NETWORK_ID,
    coin: BRIDGE_COIN_ID,
    chain,
    envelope: buildJsonRpcPayload(input.method, input.params || [], input.id ?? 'metayoshi')
  }
}

export function buildSendCoinPayload(input: {
  toAddress: string
  amount: string | number
  opToken?: string
  chain?: Chain | string
  wallet?: string
}) {
  return {
    networkId: NETWORK_ID,
    coin: BRIDGE_COIN_ID,
    chain: normalizeChain(String(input.chain ?? SETTINGS.bridge.chain)),
    wallet: String(input.wallet ?? '').trim(),
    toAddress: String(input.toAddress ?? '').trim(),
    amount: String(input.amount ?? ''),
    opToken: String(input.opToken ?? '').trim()
  }
}

export function buildSendAssetPayload(input: {
  assetId: string
  qty: string | number
  toAddress: string
  opToken?: string
  chain?: Chain | string
  wallet?: string
}) {
  return {
    networkId: NETWORK_ID,
    coin: BRIDGE_COIN_ID,
    chain: normalizeChain(String(input.chain ?? SETTINGS.bridge.chain)),
    wallet: String(input.wallet ?? '').trim(),
    assetId: String(input.assetId ?? '').trim(),
    qty: String(input.qty ?? ''),
    toAddress: String(input.toAddress ?? '').trim(),
    opToken: String(input.opToken ?? '').trim()
  }
}

const SENSITIVE_KEY_RE = /(priv(?:ate)?key|mnemonic|seed|xprv|passphrase|secret|keystore|recovery|walletpassphrase)/i
const WRITE_METHOD_RE = /^(send|submit|transfer|create|update|wallet|import|sign)/i

function hasSensitiveKeys(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEY_RE.test(k)) return true
    if (typeof v === 'object' && v !== null && hasSensitiveKeys(v)) return true
  }
  return false
}

const INTERCEPTOR_CONFIG = {
  request: { enabled: true, strictNonCustodial: true, blockSensitivePayload: true },
  response: { enabled: true, normalizeErrors: true, includeTimestamp: true }
} as const

export function requestInterceptor(input: {
  method?: string
  params?: any[]
  body?: any
  chain?: Chain | string
  path?: string
}) {
  const method = String(input.method ?? '').trim().toLowerCase()
  const params = Array.isArray(input.params) ? input.params : []
  const body = input.body && typeof input.body === 'object' ? input.body : null
  const isWrite = WRITE_METHOD_RE.test(method)

  const blockedByList = SETTINGS.security.blockedMethods
    .map((m) => String(m).toLowerCase())
    .includes(method)

  const blockedSensitive = Boolean(
    body &&
    SETTINGS.security.blockSensitivePayloadKeys &&
    INTERCEPTOR_CONFIG.request.enabled &&
    INTERCEPTOR_CONFIG.request.blockSensitivePayload &&
    hasSensitiveKeys(body)
  )

  const blockedByNonCustodial = Boolean(
    SETTINGS.security.nonCustodialOnly &&
    INTERCEPTOR_CONFIG.request.enabled &&
    INTERCEPTOR_CONFIG.request.strictNonCustodial &&
    blockedByList
  )

  const blocked = blockedSensitive || blockedByNonCustodial

  return {
    ok: !blocked,
    blocked,
    reason: blocked
      ? (blockedSensitive ? 'blocked_by_sensitive_payload_policy' : 'blocked_by_non_custodial_policy')
      : '',
    coin: COIN_ID,
    bridgeCoinId: BRIDGE_COIN_ID,
    chain: normalizeChain(String(input.chain ?? SETTINGS.bridge.chain)),
    method,
    isWrite,
    params,
    path: String(input.path ?? ''),
    ts: Date.now()
  }
}

export function responseInterceptor(input: {
  status?: number
  result?: any
  error?: any
  method?: string
}) {
  const status = Number(input.status ?? 0)
  const ok = !input.error && (status === 0 || (status >= 200 && status < 300))
  return {
    ok,
    coin: COIN_ID,
    bridgeCoinId: BRIDGE_COIN_ID,
    method: String(input.method ?? '').trim().toLowerCase(),
    status,
    result: input.result ?? null,
    error: input.error ?? null,
    ts: Date.now()
  }
}

const PAYLOAD_TEMPLATES = {
  read: buildBridgePayload({ method: 'getblockchaininfo', params: [] }),
  balance: buildBridgePayload({ method: '${balanceMethod}', params: [] }),
  sendCoin: buildSendCoinPayload({ toAddress: '', amount: '', opToken: '' }),
  sendAsset: buildSendAssetPayload({ assetId: '', qty: '', toAddress: '', opToken: '' })
}

export const PACKED_COIN_FEATURE: PackedCoinFeature = {
  networkId: NETWORK_ID,
  coinId: COIN_ID,
  bridgeCoinId: BRIDGE_COIN_ID,
  runtimeModelId: RUNTIME_MODEL_ID,
  name: COIN_NAME,
  symbol: COIN_SYMBOL,
  coinType: COIN_TYPE,
  decimals: COIN_DECIMALS,
  logoPath: LOGO_PATH,
  settings: { ...SETTINGS, commonFeatures: COMMON_FEATURES },
  payloadTemplates: PAYLOAD_TEMPLATES,
  interceptorConfig: INTERCEPTOR_CONFIG
}

export default PACKED_COIN_FEATURE
`;
}

function buildIndex(entries) {
  const imports = entries.map((e, i) => `import feature${i} from './${e.coinId}/${e.coinId}.features'`).join('\n');
  const mapLines = entries.map((e, i) => `  ${JSON.stringify(e.coinId)}: feature${i}`).join(',\n');
  const mapNetwork = entries.map((e, i) => `  ${JSON.stringify(e.networkId)}: feature${i}`).join(',\n');
  return `${imports}\n\nexport const PACKED_COIN_FEATURES_BY_COIN_ID = Object.freeze({\n${mapLines}\n})\n\n`
    + `export const PACKED_COIN_FEATURES_BY_NETWORK_ID = Object.freeze({\n${mapNetwork}\n})\n\n`
    + `export const PACKED_COIN_FEATURES = Object.freeze(Object.values(PACKED_COIN_FEATURES_BY_COIN_ID))\n\n`
    + `export function getPackedCoinFeatureByCoinId(coinId?: string) {\n`
    + `  const key = String(coinId || '').trim().toLowerCase()\n`
    + `  return (PACKED_COIN_FEATURES_BY_COIN_ID as Record<string, any>)[key] || null\n`
    + `}\n\n`
    + `export function getPackedCoinFeatureByNetworkId(networkId?: string) {\n`
    + `  const key = String(networkId || '').trim().toLowerCase()\n`
    + `  return (PACKED_COIN_FEATURES_BY_NETWORK_ID as Record<string, any>)[key] || null\n`
    + `}\n`;
}

ensureDir(coinsRoot);

const mapped = parseMappingReport(mappingReportPath);
if (mapped.length === 0) {
  throw new Error('No mapped coins found in server-coin-mapping-report.md');
}

const activeMeta = parseActiveCoins(activeCoinsPath);
const uniqueByCoinId = new Map();
for (const row of mapped) {
  if (!row.coinId) continue;
  if (!uniqueByCoinId.has(row.coinId)) uniqueByCoinId.set(row.coinId, row);
}

const rows = [...uniqueByCoinId.values()].sort((a, b) => a.coinId.localeCompare(b.coinId));
const generated = [];

for (const row of rows) {
  const coinId = row.coinId;
  const runtimeModelId = resolveRuntimeModelId(coinId, row.runtimeModelId);
  const meta = activeMeta.get(coinId);
  const networkId = coinId;
  const bridgeCoinId = inferBridgeCoinId(coinId);
  const symbol = resolveSymbol(coinId, runtimeModelId, meta);
  const coinType = resolveCoinType(runtimeModelId);
  const chains = meta?.chains || ['main'];
  const name = toTitle(coinId);
  const logoSource = pickLogo(coinId, runtimeModelId);
  const logoExt = (path.extname(logoSource) || '.png').toLowerCase();

  const coinDir = path.join(coinsRoot, coinId);
  ensureDir(coinDir);

  // Remove legacy generic filenames to avoid future naming conflicts.
  const legacyGenericFiles = [
    'coin.feature.ts',
    'logo.png',
    'logo.webp',
    'logo.jpg',
    'logo.jpeg'
  ];
  for (const legacyName of legacyGenericFiles) {
    const legacyPath = path.join(coinDir, legacyName);
    if (fs.existsSync(legacyPath)) fs.rmSync(legacyPath, { force: true });
  }

  const logoTarget = path.join(coinDir, `${coinId}${logoExt}`);
  fs.copyFileSync(logoSource, logoTarget);

  const featureTs = featureFileContent({
    networkId,
    coinId,
    bridgeCoinId,
    runtimeModelId,
    name,
    symbol,
    coinType,
    decimals: resolveDecimals(symbol, runtimeModelId, coinType),
    chains,
    logoExt
  });

  fs.writeFileSync(path.join(coinDir, `${coinId}.features.ts`), featureTs, 'utf8');

  generated.push({ coinId, networkId });
}

fs.writeFileSync(packedRegistryPath, buildIndex(generated), 'utf8');
console.log(`Generated packed coin feature folders: ${generated.length}`);
