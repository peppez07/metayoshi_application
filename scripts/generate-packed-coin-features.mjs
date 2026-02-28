import fs from 'fs';
import path from 'path';

const appRoot = process.cwd();
const srcRoot = path.join(appRoot, 'src');
const packedRoot = path.join(srcRoot, 'coins', 'packed');
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
  const activeSymbol = String(activeMeta?.symbol || '').trim().toUpperCase();
  if (activeSymbol && activeSymbol.length <= 5) return activeSymbol;
  if (defaults[runtimeModelId]) return defaults[runtimeModelId];
  if (activeSymbol) return activeSymbol;
  return coinId.replace(/[^a-z0-9]/g, '').slice(0, 6).toUpperCase() || 'COIN';
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

function featureFileContent(input) {
  const chainLayer = resolveLayerProfile(input.coinId, input.runtimeModelId, input.coinType);
  const rpcModel = resolveRpcModel(input.coinType);
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
    bridge: {
      chain: input.chains[0] || 'main',
      supportedChains: input.chains,
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
      blockedMethods: ['importprivkey', 'dumpprivkey', 'importwallet', 'dumpwallet'],
      requireAddressValidation: true,
      requireAmountValidation: true
    },
    sync: {
      autoRefreshMs: 30000,
      healthCheckMs: 6000,
      watchdogEnabled: true,
      cacheTtlMs: 1500
    },
    explorer: {
      txUrlTemplate: '',
      addressUrlTemplate: '',
      blockUrlTemplate: ''
    },
    custom: {
      envPrefix: String(input.symbol || input.coinId).toUpperCase(),
      notes: 'All settings are editable at runtime by the application if needed.'
    }
  };

  return `/**\n`
    + ` * AUTO-GENERATED PACKED COIN FEATURE\n`
    + ` * - One file per coin with duplicated logic by design.\n`
    + ` * - Includes settings, payload builders, interceptors, and defaults.\n`
    + ` */\n\n`
    + `export type PackedCoinFeature = {\n`
    + `  networkId: string\n`
    + `  coinId: string\n`
    + `  bridgeCoinId: string\n`
    + `  runtimeModelId: string\n`
    + `  name: string\n`
    + `  symbol: string\n`
    + `  coinType: string\n`
    + `  decimals: number\n`
    + `  logoPath: string\n`
    + `  settings: Record<string, any>\n`
    + `  payloadTemplates: Record<string, any>\n`
    + `  interceptorConfig: Record<string, any>\n`
    + `}\n\n`
    + `// --- Identity -----------------------------------------------------------\n`
    + `const NETWORK_ID = ${JSON.stringify(input.networkId)}\n`
    + `const COIN_ID = ${JSON.stringify(input.coinId)}\n`
    + `const BRIDGE_COIN_ID = ${JSON.stringify(input.bridgeCoinId)}\n`
    + `const RUNTIME_MODEL_ID = ${JSON.stringify(input.runtimeModelId)}\n`
    + `const COIN_NAME = ${JSON.stringify(input.name)}\n`
    + `const COIN_SYMBOL = ${JSON.stringify(input.symbol)}\n`
    + `const COIN_TYPE = ${JSON.stringify(input.coinType)}\n`
    + `const COIN_DECIMALS = ${input.decimals}\n`
    + `const LOGO_PATH = './logo${input.logoExt}'\n\n`
    + `// --- Full Customizable Settings ----------------------------------------\n`
    + `const SETTINGS = ${JSON.stringify(settings, null, 2)}\n\n`
    + `// --- Common Feature Flags ----------------------------------------------\n`
    + `const COMMON_FEATURES = {\n`
    + `  nativeSend: Boolean(SETTINGS?.capabilities?.nativeSend),\n`
    + `  assetLayer: Boolean(SETTINGS?.capabilities?.assetLayer),\n`
    + `  assetSend: Boolean(SETTINGS?.capabilities?.assetSend),\n`
    + `  nft: Boolean(SETTINGS?.capabilities?.nft),\n`
    + `  bridgeReads: Boolean(SETTINGS?.capabilities?.bridgeReads),\n`
    + `  bridgeWrites: Boolean(SETTINGS?.capabilities?.bridgeWrites)\n`
    + `}\n\n`
    + `function normalizeChain(chain?: string): 'main' | 'test' {\n`
    + `  const c = String(chain || '').trim().toLowerCase()\n`
    + `  if (c === 'test' || c === 'testnet') return 'test'\n`
    + `  return 'main'\n`
    + `}\n\n`
    + `// --- Payload Builders ---------------------------------------------------\n`
    + `export function buildJsonRpcPayload(method: string, params: any[] = [], id: string | number | null = 'metayoshi') {\n`
    + `  return { jsonrpc: '2.0', id, method: String(method || '').trim(), params: Array.isArray(params) ? params : [] }\n`
    + `}\n\n`
    + `export function buildBridgePayload(input: {\n`
    + `  method: string\n`
    + `  params?: any[]\n`
    + `  id?: string | number | null\n`
    + `  chain?: string\n`
    + `}) {\n`
    + `  const chain = normalizeChain(input.chain || SETTINGS.bridge.chain)\n`
    + `  return {\n`
    + `    networkId: NETWORK_ID,\n`
    + `    coin: BRIDGE_COIN_ID,\n`
    + `    chain,\n`
    + `    envelope: buildJsonRpcPayload(input.method, input.params || [], input.id || 'metayoshi')\n`
    + `  }\n`
    + `}\n\n`
    + `export function buildSendCoinPayload(input: {\n`
    + `  toAddress: string\n`
    + `  amount: string | number\n`
    + `  opToken?: string\n`
    + `  chain?: string\n`
    + `  wallet?: string\n`
    + `}) {\n`
    + `  return {\n`
    + `    networkId: NETWORK_ID,\n`
    + `    coin: BRIDGE_COIN_ID,\n`
    + `    chain: normalizeChain(input.chain || SETTINGS.bridge.chain),\n`
    + `    wallet: String(input.wallet || '').trim(),\n`
    + `    toAddress: String(input.toAddress || '').trim(),\n`
    + `    amount: String(input.amount ?? ''),\n`
    + `    opToken: String(input.opToken || '').trim()\n`
    + `  }\n`
    + `}\n\n`
    + `export function buildSendAssetPayload(input: {\n`
    + `  assetId: string\n`
    + `  qty: string | number\n`
    + `  toAddress: string\n`
    + `  opToken?: string\n`
    + `  chain?: string\n`
    + `  wallet?: string\n`
    + `}) {\n`
    + `  return {\n`
    + `    networkId: NETWORK_ID,\n`
    + `    coin: BRIDGE_COIN_ID,\n`
    + `    chain: normalizeChain(input.chain || SETTINGS.bridge.chain),\n`
    + `    wallet: String(input.wallet || '').trim(),\n`
    + `    assetId: String(input.assetId || '').trim(),\n`
    + `    qty: String(input.qty ?? ''),\n`
    + `    toAddress: String(input.toAddress || '').trim(),\n`
    + `    opToken: String(input.opToken || '').trim()\n`
    + `  }\n`
    + `}\n\n`
    + `// --- Interceptors -------------------------------------------------------\n`
    + `const SENSITIVE_KEY_RE = /(priv(?:ate)?key|mnemonic|seed|xprv|passphrase|secret|keystore|recovery|walletpassphrase)/i\n`
    + `const WRITE_METHOD_RE = /^(send|submit|transfer|create|update|wallet|import|sign)/i\n\n`
    + `export function requestInterceptor(input: {\n`
    + `  method?: string\n`
    + `  params?: any[]\n`
    + `  body?: any\n`
    + `  chain?: string\n`
    + `  path?: string\n`
    + `}) {\n`
    + `  const method = String(input.method || '').trim().toLowerCase()\n`
    + `  const params = Array.isArray(input.params) ? input.params : []\n`
    + `  const body = input.body && typeof input.body === 'object' ? input.body : null\n`
    + `  const blockedSensitive = body ? Object.keys(body).some((k) => SENSITIVE_KEY_RE.test(k)) : false\n`
    + `  const isWrite = WRITE_METHOD_RE.test(method)\n`
    + `  const blocked = blockedSensitive || (SETTINGS.security.nonCustodialOnly && method === 'importprivkey')\n`
    + `  return {\n`
    + `    ok: !blocked,\n`
    + `    blocked,\n`
    + `    reason: blocked ? 'blocked_by_non_custodial_policy' : '',\n`
    + `    coin: COIN_ID,\n`
    + `    bridgeCoinId: BRIDGE_COIN_ID,\n`
    + `    chain: normalizeChain(input.chain || SETTINGS.bridge.chain),\n`
    + `    method,\n`
    + `    isWrite,\n`
    + `    params,\n`
    + `    path: String(input.path || ''),\n`
    + `    ts: Date.now()\n`
    + `  }\n`
    + `}\n\n`
    + `export function responseInterceptor(input: {\n`
    + `  status?: number\n`
    + `  result?: any\n`
    + `  error?: any\n`
    + `  method?: string\n`
    + `}) {\n`
    + `  const status = Number(input.status || 0)\n`
    + `  const ok = !input.error && (status === 0 || (status >= 200 && status < 300))\n`
    + `  return {\n`
    + `    ok,\n`
    + `    coin: COIN_ID,\n`
    + `    bridgeCoinId: BRIDGE_COIN_ID,\n`
    + `    method: String(input.method || '').trim().toLowerCase(),\n`
    + `    status,\n`
    + `    result: input.result ?? null,\n`
    + `    error: input.error ?? null,\n`
    + `    ts: Date.now()\n`
    + `  }\n`
    + `}\n\n`
    + `// --- Payload Templates --------------------------------------------------\n`
    + `const PAYLOAD_TEMPLATES = {\n`
    + `  read: buildBridgePayload({ method: 'getblockchaininfo', params: [] }),\n`
    + `  balance: buildBridgePayload({ method: ${isEvmModel(input.runtimeModelId) ? "'eth_getBalance'" : "'getbalance'"}, params: [] }),\n`
    + `  sendCoin: buildSendCoinPayload({ toAddress: '', amount: '', opToken: '' }),\n`
    + `  sendAsset: buildSendAssetPayload({ assetId: '', qty: '', toAddress: '', opToken: '' })\n`
    + `}\n\n`
    + `// --- Interceptor Configuration -----------------------------------------\n`
    + `const INTERCEPTOR_CONFIG = {\n`
    + `  request: { enabled: true, strictNonCustodial: true, blockSensitivePayload: true },\n`
    + `  response: { enabled: true, normalizeErrors: true, includeTimestamp: true }\n`
    + `}\n\n`
    + `export const PACKED_COIN_FEATURE: PackedCoinFeature = {\n`
    + `  networkId: NETWORK_ID,\n`
    + `  coinId: COIN_ID,\n`
    + `  bridgeCoinId: BRIDGE_COIN_ID,\n`
    + `  runtimeModelId: RUNTIME_MODEL_ID,\n`
    + `  name: COIN_NAME,\n`
    + `  symbol: COIN_SYMBOL,\n`
    + `  coinType: COIN_TYPE,\n`
    + `  decimals: COIN_DECIMALS,\n`
    + `  logoPath: LOGO_PATH,\n`
    + `  settings: { ...SETTINGS, commonFeatures: COMMON_FEATURES },\n`
    + `  payloadTemplates: PAYLOAD_TEMPLATES,\n`
    + `  interceptorConfig: INTERCEPTOR_CONFIG\n`
    + `}\n\n`
    + `export default PACKED_COIN_FEATURE\n`;
}

function buildIndex(entries) {
  const imports = entries.map((e, i) => `import feature${i} from './${e.coinId}/coin.feature'`).join('\n');
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

ensureDir(packedRoot);

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
  const runtimeModelId = row.runtimeModelId || 'generic';
  const meta = activeMeta.get(coinId);
  const networkId = coinId;
  const bridgeCoinId = inferBridgeCoinId(coinId);
  const symbol = resolveSymbol(coinId, runtimeModelId, meta);
  const coinType = resolveCoinType(runtimeModelId);
  const chains = meta?.chains || ['main'];
  const name = toTitle(coinId);
  const logoSource = pickLogo(coinId, runtimeModelId);
  const logoExt = (path.extname(logoSource) || '.png').toLowerCase();

  const coinDir = path.join(packedRoot, coinId);
  ensureDir(coinDir);

  const logoTarget = path.join(coinDir, `logo${logoExt}`);
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

  fs.writeFileSync(path.join(coinDir, 'coin.feature.ts'), featureTs, 'utf8');

  generated.push({ coinId, networkId });
}

fs.writeFileSync(path.join(packedRoot, 'index.ts'), buildIndex(generated), 'utf8');
console.log(`Generated packed coin feature folders: ${generated.length}`);
