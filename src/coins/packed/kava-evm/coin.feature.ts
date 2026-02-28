/**
 * AUTO-GENERATED PACKED COIN FEATURE
 * - One file per coin with duplicated logic by design.
 * - Includes settings, payload builders, interceptors, and defaults.
 */

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

// --- Identity -----------------------------------------------------------
const NETWORK_ID = "kava-evm"
const COIN_ID = "kava-evm"
const BRIDGE_COIN_ID = "kava-evm"
const RUNTIME_MODEL_ID = "eth"
const COIN_NAME = "Kava Evm"
const COIN_SYMBOL = "ETH"
const COIN_TYPE = "EVM"
const COIN_DECIMALS = 18
const LOGO_PATH = './logo.png'

// --- Full Customizable Settings ----------------------------------------
const SETTINGS = {
  "identity": {
    "networkId": "kava-evm",
    "coinId": "kava-evm",
    "bridgeCoinId": "kava-evm",
    "runtimeModelId": "eth",
    "name": "Kava Evm",
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
      "dumpwallet"
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
    "txUrlTemplate": "",
    "addressUrlTemplate": "",
    "blockUrlTemplate": ""
  },
  "custom": {
    "envPrefix": "ETH",
    "notes": "All settings are editable at runtime by the application if needed."
  }
}

// --- Common Feature Flags ----------------------------------------------
const COMMON_FEATURES = {
  nativeSend: Boolean(SETTINGS?.capabilities?.nativeSend),
  assetLayer: Boolean(SETTINGS?.capabilities?.assetLayer),
  assetSend: Boolean(SETTINGS?.capabilities?.assetSend),
  nft: Boolean(SETTINGS?.capabilities?.nft),
  bridgeReads: Boolean(SETTINGS?.capabilities?.bridgeReads),
  bridgeWrites: Boolean(SETTINGS?.capabilities?.bridgeWrites)
}

function normalizeChain(chain?: string): 'main' | 'test' {
  const c = String(chain || '').trim().toLowerCase()
  if (c === 'test' || c === 'testnet') return 'test'
  return 'main'
}

// --- Payload Builders ---------------------------------------------------
export function buildJsonRpcPayload(method: string, params: any[] = [], id: string | number | null = 'metayoshi') {
  return { jsonrpc: '2.0', id, method: String(method || '').trim(), params: Array.isArray(params) ? params : [] }
}

export function buildBridgePayload(input: {
  method: string
  params?: any[]
  id?: string | number | null
  chain?: string
}) {
  const chain = normalizeChain(input.chain || SETTINGS.bridge.chain)
  return {
    networkId: NETWORK_ID,
    coin: BRIDGE_COIN_ID,
    chain,
    envelope: buildJsonRpcPayload(input.method, input.params || [], input.id || 'metayoshi')
  }
}

export function buildSendCoinPayload(input: {
  toAddress: string
  amount: string | number
  opToken?: string
  chain?: string
  wallet?: string
}) {
  return {
    networkId: NETWORK_ID,
    coin: BRIDGE_COIN_ID,
    chain: normalizeChain(input.chain || SETTINGS.bridge.chain),
    wallet: String(input.wallet || '').trim(),
    toAddress: String(input.toAddress || '').trim(),
    amount: String(input.amount ?? ''),
    opToken: String(input.opToken || '').trim()
  }
}

export function buildSendAssetPayload(input: {
  assetId: string
  qty: string | number
  toAddress: string
  opToken?: string
  chain?: string
  wallet?: string
}) {
  return {
    networkId: NETWORK_ID,
    coin: BRIDGE_COIN_ID,
    chain: normalizeChain(input.chain || SETTINGS.bridge.chain),
    wallet: String(input.wallet || '').trim(),
    assetId: String(input.assetId || '').trim(),
    qty: String(input.qty ?? ''),
    toAddress: String(input.toAddress || '').trim(),
    opToken: String(input.opToken || '').trim()
  }
}

// --- Interceptors -------------------------------------------------------
const SENSITIVE_KEY_RE = /(priv(?:ate)?key|mnemonic|seed|xprv|passphrase|secret|keystore|recovery|walletpassphrase)/i
const WRITE_METHOD_RE = /^(send|submit|transfer|create|update|wallet|import|sign)/i

export function requestInterceptor(input: {
  method?: string
  params?: any[]
  body?: any
  chain?: string
  path?: string
}) {
  const method = String(input.method || '').trim().toLowerCase()
  const params = Array.isArray(input.params) ? input.params : []
  const body = input.body && typeof input.body === 'object' ? input.body : null
  const blockedSensitive = body ? Object.keys(body).some((k) => SENSITIVE_KEY_RE.test(k)) : false
  const isWrite = WRITE_METHOD_RE.test(method)
  const blocked = blockedSensitive || (SETTINGS.security.nonCustodialOnly && method === 'importprivkey')
  return {
    ok: !blocked,
    blocked,
    reason: blocked ? 'blocked_by_non_custodial_policy' : '',
    coin: COIN_ID,
    bridgeCoinId: BRIDGE_COIN_ID,
    chain: normalizeChain(input.chain || SETTINGS.bridge.chain),
    method,
    isWrite,
    params,
    path: String(input.path || ''),
    ts: Date.now()
  }
}

export function responseInterceptor(input: {
  status?: number
  result?: any
  error?: any
  method?: string
}) {
  const status = Number(input.status || 0)
  const ok = !input.error && (status === 0 || (status >= 200 && status < 300))
  return {
    ok,
    coin: COIN_ID,
    bridgeCoinId: BRIDGE_COIN_ID,
    method: String(input.method || '').trim().toLowerCase(),
    status,
    result: input.result ?? null,
    error: input.error ?? null,
    ts: Date.now()
  }
}

// --- Payload Templates --------------------------------------------------
const PAYLOAD_TEMPLATES = {
  read: buildBridgePayload({ method: 'getblockchaininfo', params: [] }),
  balance: buildBridgePayload({ method: 'eth_getBalance', params: [] }),
  sendCoin: buildSendCoinPayload({ toAddress: '', amount: '', opToken: '' }),
  sendAsset: buildSendAssetPayload({ assetId: '', qty: '', toAddress: '', opToken: '' })
}

// --- Interceptor Configuration -----------------------------------------
const INTERCEPTOR_CONFIG = {
  request: { enabled: true, strictNonCustodial: true, blockSensitivePayload: true },
  response: { enabled: true, normalizeErrors: true, includeTimestamp: true }
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
