export const SAFE_MULTISIG_SUPPORTED_CHAIN_IDS = [1, 10, 56, 97, 100, 137, 8453, 42161, 43114] as const

const SAFE_MULTISIG_SUPPORTED_CHAIN_ID_SET = new Set<number>(SAFE_MULTISIG_SUPPORTED_CHAIN_IDS)

export interface SafeChainConfiguration {
  chainId: number
  label: string
  envKey: string
  defaultServiceUrl?: string
  networkAliases: readonly string[]
}

const SAFE_CHAIN_CONFIGS: readonly SafeChainConfiguration[] = [
  {
    chainId: 1,
    label: 'Ethereum',
    envKey: 'VITE_SAFE_SERVICE_BASE_URL_1',
    defaultServiceUrl: 'https://safe-transaction-mainnet.safe.global',
    networkAliases: ['eth', 'ethereum']
  },
  {
    chainId: 10,
    label: 'Optimism',
    envKey: 'VITE_SAFE_SERVICE_BASE_URL_10',
    defaultServiceUrl: 'https://safe-transaction-optimism.safe.global',
    networkAliases: ['op', 'optimism']
  },
  {
    chainId: 56,
    label: 'BSC Mainnet',
    envKey: 'VITE_SAFE_SERVICE_BASE_URL_56',
    defaultServiceUrl: 'https://safe-transaction-bsc.safe.global',
    networkAliases: ['bnb', 'bsc', 'bnb-mainnet', 'bsc-mainnet']
  },
  {
    chainId: 97,
    label: 'BSC Testnet',
    envKey: 'VITE_SAFE_SERVICE_BASE_URL_97',
    networkAliases: ['bnb-testnet', 'bnbt', 'bsc-testnet', 'chapel']
  },
  {
    chainId: 100,
    label: 'Gnosis',
    envKey: 'VITE_SAFE_SERVICE_BASE_URL_100',
    defaultServiceUrl: 'https://safe-transaction-gnosis-chain.safe.global',
    networkAliases: ['gnosis']
  },
  {
    chainId: 137,
    label: 'Polygon',
    envKey: 'VITE_SAFE_SERVICE_BASE_URL_137',
    defaultServiceUrl: 'https://safe-transaction-polygon.safe.global',
    networkAliases: ['polygon']
  },
  {
    chainId: 8453,
    label: 'Base',
    envKey: 'VITE_SAFE_SERVICE_BASE_URL_8453',
    defaultServiceUrl: 'https://safe-transaction-base.safe.global',
    networkAliases: ['base']
  },
  {
    chainId: 42161,
    label: 'Arbitrum',
    envKey: 'VITE_SAFE_SERVICE_BASE_URL_42161',
    defaultServiceUrl: 'https://safe-transaction-arbitrum.safe.global',
    networkAliases: ['arb', 'arbitrum']
  },
  {
    chainId: 43114,
    label: 'Avalanche',
    envKey: 'VITE_SAFE_SERVICE_BASE_URL_43114',
    defaultServiceUrl: 'https://safe-transaction-avalanche.safe.global',
    networkAliases: ['avaxc', 'avalanche']
  }
] as const

const SAFE_CHAIN_CONFIG_BY_ID = new Map<number, SafeChainConfiguration>(
  SAFE_CHAIN_CONFIGS.map((config) => [config.chainId, config])
)

function normalizeServiceUrl(value: unknown): string | null {
  const raw = String(value ?? '').trim()
  return raw ? raw.replace(/\/+$/, '') : null
}

function defaultEnvSource(): Record<string, unknown> {
  return ((import.meta as any)?.env || {}) as Record<string, unknown>
}

export function isSupportedSafeMultisigChainId(value: unknown): boolean {
  const parsed = typeof value === 'number' ? value : Number(String(value || '').trim())
  return Number.isInteger(parsed) && parsed > 0 && SAFE_MULTISIG_SUPPORTED_CHAIN_ID_SET.has(parsed)
}

export function getSafeChainConfiguration(chainId: number): SafeChainConfiguration | null {
  return SAFE_CHAIN_CONFIG_BY_ID.get(chainId) || null
}

export function getSafeChainConfigurations(): SafeChainConfiguration[] {
  return [...SAFE_CHAIN_CONFIGS]
}

export function resolveSafeServiceUrl(
  chainId: number,
  env: Record<string, unknown> = defaultEnvSource()
): string | null {
  const config = getSafeChainConfiguration(chainId)
  if (!config) return null
  const chainSpecific = normalizeServiceUrl(env[config.envKey])
  if (chainSpecific) return chainSpecific
  const generic = normalizeServiceUrl(env.VITE_SAFE_SERVICE_BASE_URL)
  if (generic) return generic
  return normalizeServiceUrl(config.defaultServiceUrl)
}

export function getSafeServiceConfiguration(
  chainId: number,
  env: Record<string, unknown> = defaultEnvSource()
): SafeChainConfiguration & {
  serviceUrl: string | null
  configured: boolean
} {
  const config = getSafeChainConfiguration(chainId)
  if (!config) {
    return {
      chainId,
      label: `Chain ${chainId}`,
      envKey: `VITE_SAFE_SERVICE_BASE_URL_${chainId}`,
      networkAliases: [],
      serviceUrl: null,
      configured: false
    }
  }
  const serviceUrl = resolveSafeServiceUrl(chainId, env)
  return {
    ...config,
    serviceUrl,
    configured: Boolean(serviceUrl)
  }
}

export function assertSafeServiceConfigured(
  chainId: number,
  env: Record<string, unknown> = defaultEnvSource()
): string {
  const config = getSafeServiceConfiguration(chainId, env)
  if (!config.configured || !config.serviceUrl) {
    throw new Error(
      `Safe service is not configured for ${config.label} (${chainId}). ` +
      `Set ${config.envKey} or VITE_SAFE_SERVICE_BASE_URL.`
    )
  }
  return config.serviceUrl
}
