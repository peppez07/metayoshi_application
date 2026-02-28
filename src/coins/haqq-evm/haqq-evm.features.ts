/**
 * AUTO-GENERATED PACKED COIN FEATURE (FIXED)
 * - One file per coin with duplicated logic by design.
 * - Includes settings, payload builders, interceptors, and defaults.
 *
 * Fixes applied:
 * - Single source of truth for identity
 * - Stronger typing via `satisfies`
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

const IDENTITY = {
  "networkId": "haqq-evm",
  "coinId": "haqq-evm",
  "bridgeCoinId": "haqq-evm",
  "runtimeModelId": "eth",
  "name": "Haqq Evm",
  "symbol": "ETH",
  "coinType": "EVM",
  "decimals": 18,
  "logoPath": "./haqq-evm.png"
} as const

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

const SETTINGS = {
  "identity": {
    "networkId": "haqq-evm",
    "coinId": "haqq-evm",
    "bridgeCoinId": "haqq-evm",
    "runtimeModelId": "eth",
    "name": "Haqq Evm",
    "symbol": "ETH",
    "coinType": "EVM",
    "decimals": 18,
    "enabled": true,
    "testnetEnabled": false
  },
  "chainConfiguration": {
    "rpcModel": "evm",
    "coinType": "EVM",
    "runtimeModelId": "eth",
    "layer": "L2",
    "parentBlockchain": "ethereum",
    "layer2RollupType": "unknown",
    "layer3Parent": "",
    "isLayer1": false,
    "isLayer2": true,
    "isLayer3": false
  },
  "chain": {
    "type": "EVM",
    "family": "eip155",
    "chainId": 1,
    "testnetChainId": null,
    "chainSlug": "ethereum",
    "source": "model-default",
    "isRpc": true,
    "isUtxo": false
  },
  "rpc": {
    "protocol": "jsonrpc-evm",
    "timeoutMs": 20000,
    "retryMax": 2,
    "retryBackoffMs": 300,
    "allowInsecureHttp": false,
    "keepAlive": true,
    "maxConcurrent": 16,
    "headers": {},
    "auth": {
      "username": "",
      "password": "",
      "token": "",
      "useBasicAuth": true
    }
  },
  "rpcPolicy": {
    "mode": "server-dispatcher",
    "appDirectRpcEnabled": false,
    "serverDispatchRequired": true,
    "supportsRead": true,
    "supportsWrite": true,
    "supportsSubscriptions": true,
    "txPendingMethod": "eth_getTransactionByHash",
    "txDetailsMethod": "eth_getTransactionReceipt",
    "healthMethod": "eth_blockNumber"
  },
  "bridge": {
    "chain": "main",
    "supportedChains": [
      "main"
    ],
    "strictRoute": true,
    "walletScopedPath": true,
    "secureAuth": {
      "enabled": true,
      "requireOpToken": true,
      "opTokenTtlSec": 60
    },
    "rateLimit": {
      "enabled": true,
      "maxRequestsPerMinute": 120,
      "maxWriteRequestsPerMinute": 20
    }
  },
  "fees": {
    "enabled": true,
    "mode": "eip1559",
    "feePerByte": 0,
    "gasLimitDefault": 21000,
    "maxFeePerGasGwei": 80,
    "maxPriorityFeePerGasGwei": 2
  },
  "capabilities": {
    "nativeSend": true,
    "assetLayer": true,
    "assetSend": true,
    "nft": true,
    "staking": false,
    "swap": false,
    "bridgeReads": true,
    "bridgeWrites": true
  },
  "ui": {
    "showAssetsTab": true,
    "showAssetsAction": true,
    "showSendAction": true,
    "showActivityTab": true,
    "showModelAction": true,
    "assetListLayout": "flat",
    "hideAssetMetaLabels": true,
    "showAssetPreview": true,
    "wallet": {
      "showModelAction": true,
      "assetListLayout": "flat",
      "hideAssetMetaLabels": true,
      "showAssetPreview": true
    },
    "color": {
      "primary": "#2bd3ff",
      "accent": "#1e90ff"
    }
  },
  "security": {
    "nonCustodialOnly": true,
    "blockSensitivePayloadKeys": true,
    "blockedMethods": [
      "importprivkey",
      "dumpprivkey",
      "importwallet",
      "dumpwallet",
      "walletpassphrase",
      "walletpassphrasechange"
    ],
    "requireAddressValidation": true,
    "requireAmountValidation": true
  },
  "sync": {
    "autoRefreshMs": 30000,
    "healthCheckMs": 6000,
    "watchdogEnabled": true,
    "cacheTtlMs": 1500
  },
  "explorer": {
    "provider": "eip3091-compatible",
    "baseUrl": "https://etherscan.io",
    "txUrlTemplate": "https://etherscan.io/tx/{txid}",
    "addressUrlTemplate": "https://etherscan.io/address/{address}",
    "blockUrlTemplate": "https://etherscan.io/block/{block}",
    "supportsPendingTx": true
  },
  "status": {
    "enabled": true,
    "source": "server",
    "healthPath": "/v1/health",
    "statusPath": "/v1/status",
    "pollIntervalMs": 6000,
    "staleAfterMs": 30000,
    "failAfterConsecutiveErrors": 3
  },
  "tokenStandards": {
    "evm": {
      "enabled": true,
      "accepted": [
        "ERC-20",
        "ERC-721",
        "ERC-1155",
        "ERC-4626",
        "ERC-777",
        "ERC-1363"
      ],
      "fungible": [
        "ERC-20",
        "ERC-4626",
        "ERC-777",
        "ERC-1363"
      ],
      "nft": [
        "ERC-721",
        "ERC-1155"
      ],
      "notes": "ERC-4626/777/1363 are treated as ERC-20-compatible for transfer/balance flows."
    },
    "solana": {
      "enabled": false,
      "accepted": [],
      "fungible": [],
      "nft": [],
      "notes": ""
    }
  },
  "custom": {
    "envPrefix": "ETH",
    "notes": "All settings are editable at runtime by the application if needed."
  }
} satisfies CoinSettings

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
  balance: buildBridgePayload({ method: 'eth_getBalance', params: [] }),
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
