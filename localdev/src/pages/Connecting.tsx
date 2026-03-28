import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { IoRefresh, IoWarningOutline, IoCloseCircleOutline } from 'react-icons/io5'
import clsx from 'clsx'
import { normalizeConfiguredApiBaseUrl, resolveBalanceApiBaseUrl } from '../lib/apiBase'
import { discoverWalletBackend, getDiscoveredGatewayBase, getDiscoveredRuntimeService } from '../lib/backendHelp'
import { assertBridgeCredentialsConfigured } from '../lib/bridgeCredentials'
import { DEFAULT_WALLET_SERVER_DISCOVERY_TIMEOUT_MS } from '../lib/serverTimeouts'
import { useWalletStore } from '../store/walletStore'
import type { Network } from '../store/walletStore'
import { getModelIconFrameClass } from '../buildConfig'

type Phase = 'connecting' | 'error' | 'bridge-warning'
type ServerAuthConfig = {
  walletPasswordRequired: boolean
  legacyBasicRecommended: boolean
}
type ServerAuthConfigResult = {
  config: ServerAuthConfig | null
  status?: number
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const HANDSHAKE_TIMEOUT_MS = DEFAULT_WALLET_SERVER_DISCOVERY_TIMEOUT_MS

function getBridgeOrigin(network?: Network): string | null {
  if (!network?.bridgeUrl) return null
  try {
    return new URL(network.bridgeUrl).origin
  } catch {
    return null
  }
}

function resolveServerBase(network?: Network): string | null {
  const envBase = normalizeConfiguredApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
  if (envBase) return envBase
  return getBridgeOrigin(network)
}

function buildBasicAuth(network?: Network): string | null {
  const user = network?.bridgeUsername?.trim()
  const pass = network?.bridgePassword?.trim()
  if (!user || !pass) return null
  return `Basic ${btoa(`${user}:${pass}`)}`
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = HANDSHAKE_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function fetchServerAuthConfig(authConfigUrl: string): Promise<ServerAuthConfigResult> {
  const response = await fetchWithTimeout(authConfigUrl, {}, HANDSHAKE_TIMEOUT_MS)
  if (!response.ok) return { config: null, status: response.status }
  const json = await response.json().catch(() => null)
  if (!json || json.ok !== true) return { config: null, status: response.status }
  return {
    status: response.status,
    config: {
    walletPasswordRequired: Boolean(json.walletPasswordRequired),
    legacyBasicRecommended: Boolean(json.legacyBasic?.walletRecommended)
    }
  }
}

async function runRaptoreumHandshake(network?: Network): Promise<void> {
  if (!network || network.coinSymbol !== 'RTM') return

  const serverBase = resolveServerBase(network)
  if (!serverBase) throw new Error('Server base URL is missing or invalid')
  const discovery = await discoverWalletBackend(serverBase).catch(() => null)
  const gatewayRuntime = getDiscoveredRuntimeService(discovery, 'gateway')
  const gatewayBase = getDiscoveredGatewayBase(discovery, serverBase)
  const balanceBase = resolveBalanceApiBaseUrl(gatewayBase)
  const runtimeHealthUrl = String(discovery?.runtimeHealthUrl || `${gatewayBase}/v1/runtime/health`).trim()

  const chain = 'main'

  if (gatewayRuntime && gatewayRuntime.ok === false) {
    throw new Error(`Gateway runtime is down: ${String(gatewayRuntime.error || gatewayRuntime.status || 'unavailable')}`)
  }

  // 1) /v1/auth/config for live wallet auth mode discovery
  const authConfigResult = await fetchServerAuthConfig(
    String(discovery?.authConfigUrl || `${gatewayBase}/v1/auth/config`).trim()
  )
  const authConfig = authConfigResult.config
  if (!authConfig && authConfigResult.status && authConfigResult.status >= 500) {
    throw new Error(`Gateway auth discovery is unavailable (HTTP ${authConfigResult.status} on /v1/auth/config)`)
  }

  // 2) Runtime health on the published wallet help surface.
  const healthRes = await fetchWithTimeout(runtimeHealthUrl)
  if (!healthRes.ok) {
    throw new Error(`Runtime health check failed: HTTP ${healthRes.status}`)
  }

  // 3) /v1/status on the balance host with optional app API key.
  const apiKey = String(import.meta.env.VITE_APP_API_KEY || '').trim()
  if (apiKey) {
    const statusRes = await fetchWithTimeout(`${balanceBase}/v1/status`, {
      headers: { 'X-API-Key': apiKey }
    })
    if (!statusRes.ok) {
      throw new Error(`Status check failed: HTTP ${statusRes.status}`)
    }
  }

  // 4) Optional legacy bridge smoke check
  const auth = buildBasicAuth(network)
  if (!auth && authConfig && !authConfig.walletPasswordRequired && !authConfig.legacyBasicRecommended) {
    return
  }

  assertBridgeCredentialsConfigured({
    bridgeUrl: network.bridgeUrl,
    bridgeUsername: network.bridgeUsername,
    bridgePassword: network.bridgePassword,
    name: network.name
  })
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (auth) headers.Authorization = auth
  const smokeRes = await fetchWithTimeout(`${gatewayBase}/v1/bridge/raptoreum/${chain}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '1.0',
      id: 'app-handshake-1',
      method: 'getblockchaininfo',
      params: []
    })
  })
  if (!smokeRes.ok) {
    throw new Error(`Bridge smoke check failed: HTTP ${smokeRes.status}`)
  }
  const smokeJson = await smokeRes.json().catch(() => null)
  if (smokeJson?.error) {
    throw new Error(`Bridge smoke check RPC error: ${smokeJson.error.message || 'unknown error'}`)
  }
}

const Connecting: React.FC = () => {
  const navigate = useNavigate()
  const {
    ensureNetworkAddress,
    refreshActiveBalance,
    collectActiveNetworkData,
    activeNetworkId,
    networks,
    onboardingCompleted
  } = useWalletStore()

  const [status, setStatus] = useState('Initialising wallet...')
  const [phase, setPhase] = useState<Phase>('connecting')
  const [errorMsg, setErrorMsg] = useState('')
  const [bridgeWarning, setBridgeWarning] = useState('')

  const activeNetwork = networks.find(n => n.id === activeNetworkId)

  const connect = useCallback(async () => {
    setPhase('connecting')
    setErrorMsg('')
    setBridgeWarning('')

    // ── Step 1: derive address (FATAL if it fails) ──────────────────────────
    try {
      setStatus('Deriving wallet address...')
      const address = await ensureNetworkAddress(activeNetworkId)

      if (!address) {
        const unsupportedReason =
          activeNetwork?.derivation?.status === 'unsupported'
            ? activeNetwork.derivation.reason || `${activeNetwork?.name ?? activeNetworkId} derivation is not supported in this build.`
            : null
        throw new Error(
          unsupportedReason
            ? `Could not derive an address for "${activeNetwork?.name ?? activeNetworkId}".\n${unsupportedReason}`
            : `Could not derive an address for "${activeNetwork?.name ?? activeNetworkId}".\nYour recovery phrase may be invalid.`
        )
      }
    } catch (err) {
      setPhase('error')
      setErrorMsg(err instanceof Error ? err.message : String(err))
      return
    }

    // ── Step 2: app/server handshake for RTM flow (NON-FATAL) ───────────────
    try {
      setStatus('Checking server health...')
      await runRaptoreumHandshake(activeNetwork)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setBridgeWarning(
        `Server handshake warning: ${msg}\nThis is a backend availability problem, not a wallet approval rejection.\nProceeding with bridge balance sync.`
      )
      setPhase('bridge-warning')
      await sleep(1500)
    }

    // ── Step 3: connect to bridge balance sync (NON-FATAL) ─────────────────
    try {
      setStatus(`Connecting to ${activeNetwork?.name ?? activeNetworkId} bridge...`)
      await refreshActiveBalance({ fast: true, skipZeroBalanceRecheck: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setBridgeWarning((prev) =>
        prev
          ? `${prev}\n\nBridge unreachable: ${msg}\nBalance will show 0 until bridge is available.`
          : `Bridge unreachable: ${msg}\nBalance will show 0 until bridge is available.`
      )
      setPhase('bridge-warning')
      // Give user 3 s to read the warning, then continue anyway
      await sleep(3000)
    }

    try {
      setStatus(`Loading ${activeNetwork?.name ?? activeNetworkId} assets...`)
      await collectActiveNetworkData({
        force: true,
        includeBalance: false,
        includeAssets: true,
        includeFiat: true
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setBridgeWarning((prev) =>
        prev
          ? `${prev}\n\nAsset refresh warning: ${msg}\nAsset rows may stay stale until the next refresh.`
          : `Asset refresh warning: ${msg}\nAsset rows may stay stale until the next refresh.`
      )
      setPhase('bridge-warning')
      await sleep(1500)
    }

    navigate(onboardingCompleted ? '/wallet/assets' : '/welcome')
  }, [
    ensureNetworkAddress,
    refreshActiveBalance,
    collectActiveNetworkData,
    activeNetworkId,
    activeNetwork,
    navigate,
    onboardingCompleted
  ])

  useEffect(() => {
    const timer = setTimeout(() => { void connect() }, 300)
    return () => clearTimeout(timer)
  }, [connect])

  // ── Fatal error screen ───────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-dark-800 p-8 gap-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center">
          <IoCloseCircleOutline className="w-8 h-8 text-red-400" />
        </div>

        <div className="text-center space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-primary mb-1">METAYOSHI</p>
          <p className="text-base font-bold text-red-400">Address Derivation Failed</p>
          <p className="text-xs text-gray-400 whitespace-pre-line leading-relaxed">{errorMsg}</p>
        </div>

        <button
          onClick={() => void connect()}
          className="flex items-center gap-2 px-6 py-3 bg-primary rounded-xl text-sm font-bold text-white hover:bg-primary/80 transition-colors"
        >
          <IoRefresh className="w-4 h-4" />
          Retry
        </button>

        <button
          onClick={() => navigate('/')}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Back to start
        </button>
      </div>
    )
  }

  // ── Normal / bridge-warning screen ───────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center h-full bg-dark-800 p-8">
      <div className="relative flex items-center justify-center w-full max-w-[280px] h-40">
        {/* Soft orbit ring for clearer waiting feedback */}
        <motion.div
          className="absolute w-24 h-24 rounded-full border border-primary/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />

        {/* Coin Icon */}
        <div className={clsx(
          'z-10 w-16 h-16 rounded-full bg-primary/10 border-2 flex items-center justify-center overflow-hidden animate-breathe',
          getModelIconFrameClass(activeNetwork?.id || '')
        )}>
          {activeNetwork?.logo
            ? <img src={activeNetwork.logo} alt={activeNetwork?.name} className="w-full h-full object-cover rounded-full" />
            : <div className="w-8 h-8 bg-blue-500 rounded-full" />
          }
        </div>

        {/* Connector Line */}
        <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[120px] h-[2px] bg-dark-600">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0, x: -60 }}
            animate={{
              width: ['0%', '100%', '0%'],
              x: ['-50%', '0%', '50%']
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Pulse Dot */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full shadow-[0_0_15px_rgba(245,132,31,0.8)]"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* MetaYoshi Icon */}
        <img
          src="/MetayoshiLogo.png"
          alt="MetaYoshi"
          className="z-10 w-20 h-20 object-contain object-center ml-auto drop-shadow-[0_0_12px_rgba(245,132,31,0.25)]"
        />
      </div>

      <motion.p
        className="mt-8 text-[11px] font-black uppercase tracking-[0.28em] text-primary"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        METAYOSHI
      </motion.p>
      <motion.p
        className="mt-1.5 text-sm font-medium text-gray-400 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {status}
      </motion.p>
      <div className="mt-2 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/80"
            animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
          />
        ))}
      </div>

      {/* Bridge warning banner */}
      <AnimatePresence>
        {phase === 'bridge-warning' && bridgeWarning && (
          <motion.div
            className="mt-6 w-full flex gap-3 items-start bg-yellow-500/10 border border-yellow-500/40 rounded-xl p-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <IoWarningOutline className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-300 whitespace-pre-line leading-relaxed">{bridgeWarning}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Connecting
