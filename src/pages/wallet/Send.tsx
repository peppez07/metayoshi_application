import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWalletStore, type Network, type SendableItem } from '../../store/walletStore'
import { Input } from '../../components/Input'
import SendTransferForm from '../../components/send/SendTransferForm'
import { resolveNetworkCapabilities } from '../../lib/networkCapabilities'
import { getAccountDisplayName } from '../../lib/accountName'
import { getEnabledNetworks } from '../../lib/networkVisibility'
import { getTokenLogoForAsset } from '../../coins/tokenlogos'
import {
  IoArrowBackOutline,
  IoChevronDownOutline,
  IoChevronForwardOutline,
  IoInformationCircleOutline,
  IoLayersOutline,
  IoPin,
  IoSearchOutline
} from 'react-icons/io5'

function formatUnits8(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 8 })
}

function formatUnits8Plain(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  return value.toFixed(8).replace(/\.?0+$/, '')
}

function formatRawAmountPlain(rawAmount: number): string {
  return formatUnits8Plain(Math.max(0, Number(rawAmount || 0)) / 1e8)
}

function estimateNativeSendFee(network: { coinType: string; feePerByte?: number }): number {
  if (network.coinType === 'UTXO') {
    const rawFeePerByteCoins = Number(network.feePerByte ?? 0.0000002)
    let feePerByteSats = Math.max(1, Math.round(rawFeePerByteCoins * 1e8))
    if (feePerByteSats > 500) feePerByteSats = Math.max(1, Math.round(feePerByteSats / 1000))
    const estimatedBytes = 10 + (148 * 2) + (34 * 3)
    return (estimatedBytes * feePerByteSats) / 1e8
  }
  if (network.coinType === 'XRP') return 0.000012
  return 0.002151
}

function shortAddress(address: string): string {
  const raw = String(address || '').trim()
  if (!raw) return 'Address unavailable'
  if (raw.length <= 14) return raw
  return `${raw.slice(0, 8)}...${raw.slice(-6)}`
}

type SendRouteState = {
  assetId?: string
  sendEntryId?: string
  quickSendNative?: boolean
  hubMode?: 'global'
  autoScan?: boolean
}
type GlobalScanMode = 'auto' | 'manual'
type GlobalScanOptions = {
  reason?: string
  mode?: GlobalScanMode
  refreshBalances?: boolean
  forceAssetRefresh?: boolean
}
type SendHubScanDiagnostics = {
  mode: GlobalScanMode
  reason: string
  startedAt: number
  finishedAt: number
  durationMs: number
  totalSteps: number
  succeededSteps: number
  failedSteps: number
  lastFailure?: string
}

type ScanHolder = {
  key: string
  networkId: string
  networkSymbol: string
  accountId: string
  accountLabel: string
  address: string
  itemId: string
  assetId?: string
  requestType: 'native' | 'asset'
  kind: SendableItem['kind']
  label: string
  symbol: string
  logoUrl?: string
  rawAmount: number
  amount: string
}

type AggregatedScanRow = {
  key: string
  networkId: string
  networkSymbol: string
  networkName: string
  networkLogo?: string
  itemId: string
  assetId?: string
  requestType: 'native' | 'asset'
  kind: SendableItem['kind']
  label: string
  symbol: string
  logoUrl?: string
  rawAmount: number
  amount: string
  holders: ScanHolder[]
}

type CachedScanPayload = {
  rows: AggregatedScanRow[]
  updatedAt: number
}

type BatchPlanRow = {
  holder: ScanHolder
  amountRaw: number
  amount: string
  skippedReason?: string
}

type BatchSendResult = {
  holder: ScanHolder
  amount: string
  ok: boolean
  txid?: string
  error?: string
}

type SendHubPreferences = {
  order: string[]
  pinned: string[]
}

const SEND_HUB_SCAN_CACHE_KEY = 'metayoshi:send-hub:global-scan:v1'
const SEND_HUB_PREFERENCES_KEY = 'metayoshi:send-hub:prefs:v1'
const SEND_HUB_SCAN_AUTO_INTERVAL_MS = 90_000
const SEND_HUB_SCAN_STALE_MS = 30_000
const SEND_HUB_SCAN_MAX_TPS = 5
const SEND_HUB_SCAN_STEP_DELAY_MS = Math.max(1, Math.trunc(1000 / SEND_HUB_SCAN_MAX_TPS))
const SEND_HUB_SCAN_STEP_TIMEOUT_MS = 20_000

function normalizeKeyList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of raw) {
    const key = String(value || '').trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

function readSendHubPreferences(): SendHubPreferences {
  try {
    const raw = localStorage.getItem(SEND_HUB_PREFERENCES_KEY)
    if (!raw) return { order: [], pinned: [] }
    const parsed = JSON.parse(raw) as Partial<SendHubPreferences>
    return {
      order: normalizeKeyList(parsed?.order),
      pinned: normalizeKeyList(parsed?.pinned)
    }
  } catch {
    return { order: [], pinned: [] }
  }
}

function writeSendHubPreferences(value: SendHubPreferences): void {
  try {
    localStorage.setItem(SEND_HUB_PREFERENCES_KEY, JSON.stringify({
      order: normalizeKeyList(value.order),
      pinned: normalizeKeyList(value.pinned)
    }))
  } catch {
    // ignore local storage failures
  }
}

function normalizeSendHubPreferencesForRows(
  value: SendHubPreferences,
  rows: AggregatedScanRow[]
): SendHubPreferences {
  const known = new Set(rows.map((row) => row.key))
  return {
    order: normalizeKeyList(value.order).filter((key) => known.has(key)),
    pinned: normalizeKeyList(value.pinned).filter((key) => known.has(key))
  }
}

function moveRowKeyBefore(keys: string[], draggedKey: string, targetKey: string): string[] {
  const dragged = String(draggedKey || '').trim()
  const target = String(targetKey || '').trim()
  if (!dragged || !target || dragged === target) return [...keys]
  const withoutDragged = keys.filter((key) => key !== dragged)
  const targetIndex = withoutDragged.indexOf(target)
  if (targetIndex < 0) return [...keys]
  withoutDragged.splice(targetIndex, 0, dragged)
  return withoutDragged
}

function applySendHubPreferences(
  rows: AggregatedScanRow[],
  preferences: SendHubPreferences
): AggregatedScanRow[] {
  const rankByKey = new Map<string, number>()
  normalizeKeyList(preferences.order).forEach((key) => {
    if (rankByKey.has(key)) return
    rankByKey.set(key, rankByKey.size)
  })
  const pinnedSet = new Set(normalizeKeyList(preferences.pinned))
  const baseIndexByKey = new Map<string, number>()
  rows.forEach((row, index) => {
    baseIndexByKey.set(row.key, index)
  })

  return [...rows].sort((a, b) => {
    const aPinned = pinnedSet.has(a.key)
    const bPinned = pinnedSet.has(b.key)
    if (aPinned !== bPinned) return aPinned ? -1 : 1

    const rankA = rankByKey.get(a.key)
    const rankB = rankByKey.get(b.key)
    const hasA = typeof rankA === 'number'
    const hasB = typeof rankB === 'number'
    if (hasA && hasB && rankA !== rankB) return rankA - rankB
    if (hasA !== hasB) return hasA ? -1 : 1

    return (baseIndexByKey.get(a.key) || 0) - (baseIndexByKey.get(b.key) || 0)
  })
}

function readCachedScanRows(): CachedScanPayload | null {
  try {
    const raw = localStorage.getItem(SEND_HUB_SCAN_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedScanPayload
    if (!Array.isArray(parsed?.rows)) return null
    const updatedAt = Number(parsed?.updatedAt || 0)
    return {
      rows: parsed.rows,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0
    }
  } catch {
    return null
  }
}

function writeCachedScanRows(rows: AggregatedScanRow[]): void {
  try {
    const payload: CachedScanPayload = { rows, updatedAt: Date.now() }
    localStorage.setItem(SEND_HUB_SCAN_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // ignore storage quota/runtime failures
  }
}

function withTimeout<T>(task: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`))
    }, timeoutMs)

    task
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

function sortAggregatedScanRows(rows: AggregatedScanRow[]): AggregatedScanRow[] {
  return [...rows]
    .map((row) => ({
      ...row,
      holders: [...row.holders].sort((a, b) => b.rawAmount - a.rawAmount)
    }))
    .sort((a, b) => {
      if (b.rawAmount !== a.rawAmount) return b.rawAmount - a.rawAmount
      if (a.networkName !== b.networkName) return a.networkName.localeCompare(b.networkName)
      return a.label.localeCompare(b.label)
    })
}

function formatDurationMs(value: number): string {
  const ms = Math.max(0, Math.round(Number(value || 0)))
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)}s`
}

function buildNativeSweepAmountRaw(holderRawAmount: number, network?: Pick<Network, 'coinType' | 'feePerByte'>): number {
  const raw = Math.max(0, Math.round(Number(holderRawAmount || 0)))
  if (!network) return raw
  const estimatedFeeRaw = Math.max(0, Math.round(estimateNativeSendFee(network) * 1e8))
  return Math.max(0, raw - estimatedFeeRaw)
}

type SendBatchSweepFormProps = {
  row: AggregatedScanRow
  networkById: Map<string, Network>
  onBack: () => void
  onComplete?: () => void
}

const SendBatchSweepForm: React.FC<SendBatchSweepFormProps> = ({ row, networkById, onBack, onComplete }) => {
  const {
    networks,
    activeAccountId,
    activeNetworkId,
    setActiveAccount,
    setActiveNetwork,
    sendEvmTransaction,
    sendXrpTransaction,
    sendCardanoTransaction,
    sendMoneroTransaction,
    sendSolanaTransaction,
    sendStellarTransaction,
    sendTronTransaction,
    sendUtxoTransaction,
    sendAssetTransfer,
    addActivity,
    refreshActiveBalance
  } = useWalletStore()

  const [recipient, setRecipient] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<BatchSendResult[] | null>(null)

  const rowNetwork = networkById.get(row.networkId) || networks.find((network) => network.id === row.networkId) || networks[0]
  const rowCaps = resolveNetworkCapabilities(rowNetwork)
  const rowCanSend = row.requestType === 'native'
    ? rowCaps.features.nativeSend
    : rowCaps.features.assetSend

  const planRows = useMemo<BatchPlanRow[]>(() => (
    row.holders.map((holder) => {
      if (holder.requestType !== row.requestType) {
        return {
          holder,
          amountRaw: 0,
          amount: '0',
          skippedReason: 'Holder request type does not match the aggregated row.'
        }
      }

      if (row.requestType === 'asset') {
        const amountRaw = Math.max(0, Math.round(Number(holder.rawAmount || 0)))
        return {
          holder,
          amountRaw,
          amount: formatRawAmountPlain(amountRaw),
          skippedReason: amountRaw <= 0 ? 'No spendable asset balance for this holder.' : undefined
        }
      }

      const holderNetwork = networkById.get(holder.networkId) || networks.find((network) => network.id === holder.networkId)
      const amountRaw = buildNativeSweepAmountRaw(holder.rawAmount, holderNetwork)
      return {
        holder,
        amountRaw,
        amount: formatRawAmountPlain(amountRaw),
        skippedReason: amountRaw <= 0
          ? 'Balance too low after reserving estimated network fee.'
          : undefined
      }
    })
  ), [networkById, networks, row])

  const executablePlanRows = useMemo(
    () => planRows.filter((entry) => !entry.skippedReason && entry.amountRaw > 0),
    [planRows]
  )

  const totalPlannedRaw = useMemo(
    () => planRows.reduce((sum, entry) => sum + Math.max(0, entry.amountRaw), 0),
    [planRows]
  )

  const runBatchSend = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setResults(null)

    const toAddress = String(recipient || '').trim()
    if (!toAddress) {
      setError('Recipient address is required.')
      return
    }
    if (!rowCanSend) {
      setError(
        row.requestType === 'native'
          ? `${rowNetwork?.name || row.networkSymbol} does not support native coin sends.`
          : `${rowNetwork?.name || row.networkSymbol} does not support asset sends.`
      )
      return
    }
    if (executablePlanRows.length === 0) {
      setError('No spendable holder balances found for this merged send.')
      return
    }

    setIsSubmitting(true)

    const restoreAccountId = activeAccountId
    const restoreNetworkId = activeNetworkId
    const nextResults: BatchSendResult[] = []

    try {
      for (const plan of planRows) {
        if (plan.skippedReason || plan.amountRaw <= 0) {
          nextResults.push({
            holder: plan.holder,
            amount: plan.amount,
            ok: false,
            error: plan.skippedReason || 'No spendable balance.'
          })
          continue
        }

        try {
          const latest = useWalletStore.getState()
          if (!latest.accounts.some((account) => account.id === plan.holder.accountId)) {
            throw new Error('Account is no longer available in wallet state.')
          }
          if (!latest.networks.some((network) => network.id === plan.holder.networkId)) {
            throw new Error('Network is no longer available in wallet state.')
          }

          setActiveAccount(plan.holder.accountId)
          await setActiveNetwork(plan.holder.networkId)

          const scopedState = useWalletStore.getState()
          const scopedNetwork = scopedState.networks.find((network) => network.id === plan.holder.networkId) || rowNetwork
          const amountText = plan.amount
          let txHash = ''

          if (plan.holder.requestType === 'asset') {
            const assetId = String(plan.holder.assetId || row.assetId || '').trim()
            if (!assetId) throw new Error('Missing asset id for merged asset send.')
            const tx = await sendAssetTransfer({
              assetId,
              qty: amountText,
              toAddress
            })
            txHash = String(tx.txid || '').trim()
          } else if (scopedNetwork.coinType === 'EVM') {
            const tx = await sendEvmTransaction({ to: toAddress, amount: amountText })
            txHash = String(tx.hash || '').trim()
          } else if (scopedNetwork.coinType === 'XRP') {
            const tx = await sendXrpTransaction({ to: toAddress, amount: amountText })
            txHash = String(tx.hash || '').trim()
          } else if (scopedNetwork.id === 'ada') {
            const tx = await sendCardanoTransaction({ to: toAddress, amount: amountText })
            txHash = String(tx.hash || '').trim()
          } else if (scopedNetwork.id === 'xmr') {
            const tx = await sendMoneroTransaction({ to: toAddress, amount: amountText })
            txHash = String(tx.hash || '').trim()
          } else if (scopedNetwork.id === 'sol') {
            const tx = await sendSolanaTransaction({ to: toAddress, amount: amountText })
            txHash = String(tx.hash || '').trim()
          } else if (scopedNetwork.id === 'xlm') {
            const tx = await sendStellarTransaction({ to: toAddress, amount: amountText })
            txHash = String(tx.hash || '').trim()
          } else if (scopedNetwork.id === 'tron') {
            const tx = await sendTronTransaction({ to: toAddress, amount: amountText })
            txHash = String(tx.hash || '').trim()
          } else if (scopedNetwork.coinType === 'UTXO') {
            const tx = await sendUtxoTransaction({ to: toAddress, amount: amountText })
            txHash = String(tx.hash || '').trim()
          } else {
            throw new Error(`Unsupported network for merged send: ${scopedNetwork.name}`)
          }

          if (!txHash) throw new Error('Transaction hash missing from wallet response.')

          addActivity({
            id: txHash,
            type: 'sent',
            asset: plan.holder.requestType === 'asset'
              ? (row.label || row.symbol || row.assetId || 'ASSET')
              : String(scopedNetwork.symbol || row.networkSymbol || '').trim() || 'COIN',
            amount: amountText,
            from: plan.holder.address,
            to: toAddress,
            accountId: plan.holder.accountId,
            status: 'confirmed',
            timestamp: Date.now(),
            networkId: plan.holder.networkId
          })

          nextResults.push({
            holder: plan.holder,
            amount: amountText,
            ok: true,
            txid: txHash
          })
        } catch (err) {
          nextResults.push({
            holder: plan.holder,
            amount: plan.amount,
            ok: false,
            error: err instanceof Error ? err.message : String(err)
          })
        }
      }
    } finally {
      try {
        if (restoreAccountId) setActiveAccount(restoreAccountId)
        if (restoreNetworkId) {
          await setActiveNetwork(restoreNetworkId, { skipRefresh: true }).catch(() => {})
        }
        await refreshActiveBalance({ fast: true, skipZeroBalanceRecheck: true }).catch(() => {})
      } finally {
        setIsSubmitting(false)
      }
    }

    setResults(nextResults)
    if (nextResults.some((entry) => entry.ok)) {
      onComplete?.()
    }
  }

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 border-b border-dark-600 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors" disabled={isSubmitting}>
          <IoArrowBackOutline className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-gray-200 truncate">Merged Send</h1>
      </header>

      <form onSubmit={runBatchSend} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        <div className="rounded-xl border border-dark-600 bg-dark-700/30 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{row.label}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                {row.holders.length} holder{row.holders.length === 1 ? '' : 's'} on {row.networkName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold font-mono">{formatUnits8(totalPlannedRaw / 1e8)}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                {row.kind === 'native' ? row.networkSymbol : row.symbol}
              </p>
            </div>
          </div>
          {row.requestType === 'native' && totalPlannedRaw < row.rawAmount && (
            <p className="text-[10px] text-gray-500">
              Per-holder amount reserves estimated network fee to keep the batch send non-custodial and spendable.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Recipient Address</label>
          <Input
            placeholder={`Enter ${row.networkName} recipient`}
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            className="bg-dark-700/50 border-dark-600 font-mono text-xs"
            disabled={isSubmitting}
          />
        </div>

        <div className="rounded-xl border border-dark-600/70 bg-dark-700/20 p-3 flex gap-2.5">
          <IoInformationCircleOutline className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-500 leading-relaxed">
            This is a non-custodial batch sweep. The wallet signs one transaction per holder locally and never hands
            private keys to server infrastructure.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2">
            <p className="text-[11px] font-bold text-red-300">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          {planRows.map((plan) => (
            <div
              key={plan.holder.key}
              className={`p-2 rounded-xl border flex items-center justify-between gap-3 ${
                plan.skippedReason
                  ? 'border-yellow-500/30 bg-yellow-500/10'
                  : 'border-dark-600 bg-dark-700/40'
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{plan.holder.accountLabel}</p>
                <p className="text-[10px] text-gray-500 font-mono truncate">{shortAddress(plan.holder.address)}</p>
                {plan.skippedReason && (
                  <p className="text-[10px] text-yellow-200 mt-0.5">{plan.skippedReason}</p>
                )}
              </div>
              <p className="text-xs font-bold font-mono shrink-0">{plan.amount}</p>
            </div>
          ))}
        </div>

        {results && (
          <div className="space-y-2 rounded-xl border border-dark-600 bg-dark-700/30 p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Batch Result</p>
            {results.map((result) => (
              <div key={`result-${result.holder.key}`} className="flex items-start justify-between gap-3 text-[11px]">
                <div className="min-w-0">
                  <p className="font-bold truncate">{result.holder.accountLabel}</p>
                  <p className={`truncate ${result.ok ? 'text-green-300' : 'text-red-300'}`}>
                    {result.ok ? `Sent (${result.txid})` : `Failed: ${result.error || 'Unknown error'}`}
                  </p>
                </div>
                <p className="font-mono shrink-0">{result.amount}</p>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || executablePlanRows.length === 0 || !rowCanSend}
            className="w-full px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-primary/40 bg-primary/20 text-primary hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? 'Sending...'
              : `Send all holders (${executablePlanRows.length} tx${executablePlanRows.length === 1 ? '' : 's'})`}
          </button>
        </div>
      </form>
    </div>
  )
}

const Send: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const hasDirectRouteRequest = useMemo(() => {
    const route = (location.state as SendRouteState | null) || null
    return (
      route?.quickSendNative === true
      || Boolean(String(route?.assetId || '').trim())
      || Boolean(String(route?.sendEntryId || '').trim())
    )
  }, [location.state])
  const {
    accounts,
    networks,
    disabledNetworkIds,
    activeAccountId,
    activeNetworkId,
    networkAssets,
    getSendableItems,
    setActiveAccount,
    setActiveNetwork,
    fetchNetworkAssets
  } = useWalletStore()

  const enabledNetworks = useMemo(
    () => getEnabledNetworks(networks, disabledNetworkIds),
    [networks, disabledNetworkIds]
  )
  const enabledNetworkIds = useMemo(
    () => new Set(enabledNetworks.map((network) => network.id)),
    [enabledNetworks]
  )
  const activeNetwork = enabledNetworks.find((n) => n.id === activeNetworkId) || enabledNetworks[0]
  const networkById = useMemo(() => new Map(networks.map((network) => [network.id, network])), [networks])

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedBatchKey, setSelectedBatchKey] = useState<string | null>(null)
  const [hubPreferences, setHubPreferences] = useState<SendHubPreferences>(() => readSendHubPreferences())
  const [draggingRowKey, setDraggingRowKey] = useState<string | null>(null)
  const [dragOverRowKey, setDragOverRowKey] = useState<string | null>(null)
  const [isScanningAll, setIsScanningAll] = useState(false)
  const [, setScanProgress] = useState<{ done: number; total: number; label: string }>({
    done: 0,
    total: 0,
    label: ''
  })
  const [, setScanDiagnostics] = useState<SendHubScanDiagnostics | null>(null)
  const [scanError, setScanError] = useState('')
  const [scanRows, setScanRows] = useState<AggregatedScanRow[]>(() => {
    const cached = readCachedScanRows()
    return cached?.rows || []
  })
  const scanRowsRef = useRef<AggregatedScanRow[]>(scanRows)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const handledDeepLinkRef = useRef<string>('')
  const scanRunIdRef = useRef(0)
  const isScanningRef = useRef(false)
  const scanRestoreSelectionRef = useRef<{ accountId: string | null; networkId: string | null } | null>(null)
  const enabledNetworksSignatureRef = useRef<string>('')

  const allItems = getSendableItems({ includeHidden: true })
  const activePairItems = useMemo(() => {
    if (!activeAccountId || !activeNetworkId) return [] as SendableItem[]
    return getSendableItems({
      accountId: activeAccountId,
      networkId: activeNetworkId,
      includeHidden: true,
      includeZeroBalance: true
    })
  }, [activeAccountId, activeNetworkId, accounts, networkAssets, getSendableItems])
  const activePairItemByKey = useMemo(() => {
    const out = new Map<string, SendableItem>()
    for (const item of activePairItems) {
      out.set(item.id, item)
      if (item.assetId) out.set(`asset:${item.assetId}`, item)
    }
    return out
  }, [activePairItems])
  const visibleScanRows = useMemo(
    () => scanRows.filter((row) => enabledNetworkIds.has(row.networkId)),
    [scanRows, enabledNetworkIds]
  )

  useEffect(() => {
    scanRowsRef.current = scanRows
  }, [scanRows])
  const orderedScanRows = useMemo(
    () => applySendHubPreferences(visibleScanRows, hubPreferences),
    [visibleScanRows, hubPreferences]
  )
  const pinnedRowKeys = useMemo(() => new Set(hubPreferences.pinned), [hubPreferences.pinned])

  const filteredScanRows = useMemo(() => {
    const query = String(search || '').trim().toLowerCase()
    if (!query) return orderedScanRows
    return orderedScanRows.filter((row) => {
      const holderHaystack = row.holders
        .map((holder) => `${holder.accountLabel} ${holder.address}`.toLowerCase())
        .join(' ')
      const haystack = `${row.label} ${row.symbol} ${row.networkSymbol} ${row.networkName} ${row.assetId || ''} ${holderHaystack}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [orderedScanRows, search])

  const selectedItem = useMemo(
    () => allItems.find((row) => row.id === selectedId) || null,
    [allItems, selectedId]
  )
  const selectedBatchRow = useMemo(
    () => visibleScanRows.find((row) => row.key === selectedBatchKey) || null,
    [visibleScanRows, selectedBatchKey]
  )

  useEffect(() => {
    setHubPreferences((current) => {
      const normalized = normalizeSendHubPreferencesForRows(current, visibleScanRows)
      const sameOrder = normalized.order.length === current.order.length
        && normalized.order.every((key, index) => key === current.order[index])
      const samePinned = normalized.pinned.length === current.pinned.length
        && normalized.pinned.every((key, index) => key === current.pinned[index])
      return (sameOrder && samePinned) ? current : normalized
    })
  }, [visibleScanRows])

  useEffect(() => {
    writeSendHubPreferences(hubPreferences)
  }, [hubPreferences])

  useEffect(() => {
    if (!activeAccountId || !activeNetworkId) return
    if (isScanningRef.current) return
    if (scanRows.length === 0) return

    setScanRows((current) => {
      let changed = false
      const nextRows: AggregatedScanRow[] = []

      for (const row of current) {
        if (row.networkId !== activeNetworkId) {
          nextRows.push(row)
          continue
        }

        let rowChanged = false
        const nextHolders: ScanHolder[] = []

        for (const holder of row.holders) {
          if (holder.accountId !== activeAccountId) {
            nextHolders.push(holder)
            continue
          }

          const latest = activePairItemByKey.get(holder.itemId)
            || (holder.assetId ? activePairItemByKey.get(`asset:${holder.assetId}`) : undefined)
          const latestRawAmount = Math.max(0, Math.round(Number(latest?.rawAmount || 0)))

          if (latestRawAmount <= 0) {
            changed = true
            rowChanged = true
            continue
          }

          const latestAmount = formatUnits8(latestRawAmount / 1e8)
          if (latestRawAmount !== holder.rawAmount || latestAmount !== holder.amount) {
            changed = true
            rowChanged = true
            nextHolders.push({
              ...holder,
              rawAmount: latestRawAmount,
              amount: latestAmount
            })
            continue
          }

          nextHolders.push(holder)
        }

        if (!rowChanged) {
          nextRows.push(row)
          continue
        }

        const nextRowRaw = nextHolders.reduce((sum, holder) => sum + Math.max(0, holder.rawAmount), 0)
        if (nextRowRaw <= 0) {
          changed = true
          continue
        }

        nextRows.push({
          ...row,
          rawAmount: nextRowRaw,
          amount: formatUnits8(nextRowRaw / 1e8),
          holders: [...nextHolders].sort((a, b) => b.rawAmount - a.rawAmount)
        })
      }

      if (!changed) return current
      const sorted = sortAggregatedScanRows(nextRows)
      writeCachedScanRows(sorted)
      return sorted
    })
  }, [activeAccountId, activeNetworkId, activePairItemByKey, scanRows.length])

  useEffect(() => {
    const routeState = (location.state as SendRouteState | null) || null
    const requestedAssetId = String(routeState?.assetId || '').trim()
    const requestedEntryId = String(routeState?.sendEntryId || '').trim()
    const requestedQuickNative = routeState?.quickSendNative === true
    if (!requestedAssetId && !requestedEntryId && !requestedQuickNative) return
    if (allItems.length === 0) return

    const dedupeKey = `${requestedEntryId}|${requestedAssetId}|${requestedQuickNative ? 'native' : ''}`
    if (handledDeepLinkRef.current === dedupeKey) return
    handledDeepLinkRef.current = dedupeKey

    const match = allItems.find((item) => (
      (requestedEntryId && item.id === requestedEntryId)
      || (requestedAssetId && item.assetId === requestedAssetId)
      || (requestedQuickNative && item.requestType === 'native')
    ))
    if (match) {
      setSelectedId(match.id)
      setSelectedBatchKey(null)
    }

    navigate('/wallet/send', { replace: true, state: null })
  }, [location.state, allItems, navigate])

  const runGlobalScan = useCallback(async (options?: GlobalScanOptions) => {
    if (isScanningRef.current) return
    setScanError('')
    setIsScanningAll(true)
    isScanningRef.current = true
    const runId = scanRunIdRef.current + 1
    scanRunIdRef.current = runId
    const mode: GlobalScanMode = options?.mode === 'manual' ? 'manual' : 'auto'
    const includeBalanceRefresh = options?.refreshBalances ?? (mode === 'manual')
    const forceAssetRefresh = options?.forceAssetRefresh ?? (mode === 'manual')
    const reason = String(options?.reason || '').trim()
    const startedAt = Date.now()
    setScanProgress({
      done: 0,
      total: 0,
      label: reason
        ? `Preparing ${mode === 'manual' ? 'full' : 'background'} scan (${reason})...`
        : `Preparing ${mode === 'manual' ? 'full' : 'background'} scan...`
    })

    const stateBefore = useWalletStore.getState()
    const originalActiveAccountId = stateBefore.activeAccountId
    const originalActiveNetworkId = stateBefore.activeNetworkId
    scanRestoreSelectionRef.current = {
      accountId: originalActiveAccountId,
      networkId: originalActiveNetworkId
    }
    const originalAssetsSnapshot = {
      networkAssets: stateBefore.networkAssets,
      networkAssetLogos: stateBefore.networkAssetLogos,
      networkAssetLabels: stateBefore.networkAssetLabels,
      evmNftAssets: stateBefore.evmNftAssets
    }

    const shouldCancel = () => scanRunIdRef.current !== runId
    const scanAccounts = [...stateBefore.accounts]
    const scanNetworks = stateBefore.networks.filter((network) => {
      if (!enabledNetworkIds.has(network.id)) return false
      const networkCaps = resolveNetworkCapabilities(network)
      return networkCaps.features.nativeSend || networkCaps.features.assetLayer || networkCaps.features.assetSend
    })

    const total = Math.max(1, scanAccounts.length * scanNetworks.length)
    const aggregate = new Map<string, AggregatedScanRow>()
    for (const row of scanRowsRef.current) {
      aggregate.set(row.key, {
        ...row,
        holders: [...row.holders]
      })
    }
    let done = 0
    let succeededSteps = 0
    let failedSteps = 0
    let lastFailure = ''
    let lastPublishAt = 0
    const stepDelayMs = mode === 'manual' ? Math.min(SEND_HUB_SCAN_STEP_DELAY_MS, 80) : 0

    const publishProgressRows = (force = false) => {
      const now = Date.now()
      if (!force && now - lastPublishAt < 180) return
      lastPublishAt = now
      const rows = sortAggregatedScanRows([...aggregate.values()])
      setScanRows(rows)
      if (force) writeCachedScanRows(rows)
    }

    const replaceAccountNetworkSlice = (networkId: string, accountId: string) => {
      for (const [rowKey, row] of aggregate.entries()) {
        if (row.networkId !== networkId) continue
        const kept = row.holders.filter((holder) => !(holder.networkId === networkId && holder.accountId === accountId))
        if (kept.length === row.holders.length) continue
        if (kept.length <= 0) {
          aggregate.delete(rowKey)
          continue
        }
        const nextRaw = kept.reduce((sum, holder) => sum + Math.max(0, holder.rawAmount), 0)
        if (nextRaw <= 0) {
          aggregate.delete(rowKey)
          continue
        }
        aggregate.set(rowKey, {
          ...row,
          rawAmount: nextRaw,
          amount: formatUnits8(nextRaw / 1e8),
          holders: kept.sort((a, b) => b.rawAmount - a.rawAmount)
        })
      }
    }

    try {
      for (const account of scanAccounts) {
        if (shouldCancel()) throw new Error('[cancelled]')
        useWalletStore.setState((state) => ({
          activeAccountId: account.id
        }))
        if (shouldCancel()) throw new Error('[cancelled]')

        for (const network of scanNetworks) {
          if (shouldCancel()) throw new Error('[cancelled]')
          done += 1
          setScanProgress({
            done,
            total,
            label: failedSteps > 0
              ? `Scanning ${account.name} on ${network.symbol} (${done}/${total})... ${failedSteps} issue${failedSteps === 1 ? '' : 's'}`
              : `Scanning ${account.name} on ${network.symbol} (${done}/${total})...`
          })

          try {
            await withTimeout(
              setActiveNetwork(
                network.id,
                includeBalanceRefresh ? undefined : { skipRefresh: true }
              ),
              SEND_HUB_SCAN_STEP_TIMEOUT_MS,
              `[${network.symbol}] network switch`
            )
            if (shouldCancel()) throw new Error('[cancelled]')

            useWalletStore.setState((state) => ({
              networkAssets: { ...state.networkAssets, [network.id]: {} },
              networkAssetLogos: { ...state.networkAssetLogos, [network.id]: {} },
              networkAssetLabels: { ...state.networkAssetLabels, [network.id]: {} },
              evmNftAssets: { ...state.evmNftAssets, [network.id]: {} }
            }))
            if (shouldCancel()) throw new Error('[cancelled]')

            if (resolveNetworkCapabilities(network).features.assetLayer) {
              await withTimeout(
                fetchNetworkAssets({ force: forceAssetRefresh }),
                SEND_HUB_SCAN_STEP_TIMEOUT_MS,
                `[${network.symbol}] asset refresh`
              )
              if (shouldCancel()) throw new Error('[cancelled]')
            }

            const scanState = useWalletStore.getState()
            const refreshedAccount = scanState.accounts.find((row) => row.id === account.id) || account
            const address = String(
              refreshedAccount.networkAddresses?.[network.id]
              || (network.coinType === 'EVM' ? refreshedAccount.addresses?.EVM : '')
              || ''
            ).trim()
            const itemRows = scanState.getSendableItems({
              accountId: account.id,
              networkId: network.id,
              includeHidden: true,
              includeZeroBalance: false
            })

            // Keep existing rows visible until this exact account+network slice is refreshed.
            // After refresh, replace that slice; if fresh balance is zero it disappears.
            replaceAccountNetworkSlice(network.id, account.id)

            for (const item of itemRows) {
              const rawAmount = Math.max(0, Math.round(Number(item.rawAmount || 0)))
              if (rawAmount <= 0) continue
              const key = `${network.id}::${item.id}`
              const holderKey = `${account.id}::${network.id}::${item.id}`
              const holder: ScanHolder = {
                key: holderKey,
                networkId: network.id,
                networkSymbol: network.symbol,
                accountId: account.id,
                accountLabel: getAccountDisplayName(refreshedAccount, network.id, refreshedAccount.name),
                address,
                itemId: item.id,
                assetId: item.assetId,
                requestType: item.requestType,
                kind: item.kind,
                label: item.label,
                symbol: item.symbol,
                logoUrl: item.logoUrl,
                rawAmount,
                amount: formatUnits8(rawAmount / 1e8)
              }
              const existing = aggregate.get(key)
              if (!existing) {
                aggregate.set(key, {
                  key,
                  networkId: network.id,
                  networkSymbol: network.symbol,
                  networkName: network.name,
                  networkLogo: network.logo,
                  itemId: item.id,
                  assetId: item.assetId,
                  requestType: item.requestType,
                  kind: item.kind,
                  label: item.label,
                  symbol: item.symbol,
                  logoUrl: item.logoUrl,
                  rawAmount,
                  amount: formatUnits8(rawAmount / 1e8),
                  holders: [holder]
                })
                continue
              }
              existing.rawAmount += rawAmount
              existing.amount = formatUnits8(existing.rawAmount / 1e8)
              const holderExists = existing.holders.some((row) => row.key === holder.key)
              if (!holderExists) existing.holders.push(holder)
            }
            succeededSteps += 1
            publishProgressRows(false)
          } catch (stepError) {
            const message = stepError instanceof Error ? stepError.message : String(stepError)
            if (message === '[cancelled]') throw stepError
            failedSteps += 1
            lastFailure = `[${network.symbol}] ${message}`
            publishProgressRows(false)
          }

          if (shouldCancel()) throw new Error('[cancelled]')
          if (stepDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, stepDelayMs))
          }
        }
      }

      if (shouldCancel()) throw new Error('[cancelled]')

      publishProgressRows(true)
      const rows = sortAggregatedScanRows([...aggregate.values()])
      setExpandedRows({})
      const finishedAt = Date.now()
      setScanDiagnostics({
        mode,
        reason,
        startedAt,
        finishedAt,
        durationMs: Math.max(0, finishedAt - startedAt),
        totalSteps: total,
        succeededSteps,
        failedSteps,
        lastFailure: lastFailure || undefined
      })
      if (failedSteps > 0) {
        setScanError(`Partial scan: ${failedSteps}/${total} checks failed. Last: ${lastFailure}`)
      }
      if (rows.length === 0) {
        setScanProgress({
          done: total,
          total,
          label: `${mode === 'manual' ? 'Full scan' : 'Auto-update'} complete in ${formatDurationMs(finishedAt - startedAt)}. No balances found.`
        })
      } else {
        setScanProgress({
          done: total,
          total,
          label: `${mode === 'manual' ? 'Full scan' : 'Auto-update'} complete in ${formatDurationMs(finishedAt - startedAt)}. ${rows.length} holdings${failedSteps > 0 ? `, ${failedSteps} issue${failedSteps === 1 ? '' : 's'}` : ''}.`
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message !== '[cancelled]') {
        setScanError(`Global scan failed: ${message}`)
        const finishedAt = Date.now()
        setScanDiagnostics({
          mode,
          reason,
          startedAt,
          finishedAt,
          durationMs: Math.max(0, finishedAt - startedAt),
          totalSteps: total,
          succeededSteps,
          failedSteps: Math.max(failedSteps, 1),
          lastFailure: message
        })
      }
    } finally {
      const cancelled = shouldCancel()
      if (!cancelled) {
        useWalletStore.setState({
          networkAssets: originalAssetsSnapshot.networkAssets,
          networkAssetLogos: originalAssetsSnapshot.networkAssetLogos,
          networkAssetLabels: originalAssetsSnapshot.networkAssetLabels,
          evmNftAssets: originalAssetsSnapshot.evmNftAssets
        })

        if (originalActiveAccountId) {
          useWalletStore.setState({ activeAccountId: originalActiveAccountId })
        }
        if (originalActiveNetworkId) {
          await withTimeout(
            useWalletStore.getState().setActiveNetwork(
              originalActiveNetworkId,
              includeBalanceRefresh ? undefined : { skipRefresh: true }
            ),
            SEND_HUB_SCAN_STEP_TIMEOUT_MS,
            '[restore] network switch'
          ).catch(() => {})
          await useWalletStore.getState().fetchNetworkAssets({ force: forceAssetRefresh }).catch(() => {})
        }
      }
      if (scanRunIdRef.current === runId) {
        isScanningRef.current = false
        setIsScanningAll(false)
      }
      if (!cancelled) {
        scanRestoreSelectionRef.current = null
      }
    }
  }, [enabledNetworkIds, fetchNetworkAssets, setActiveNetwork])

  useEffect(() => {
    return () => {
      const wasScanning = isScanningRef.current
      scanRunIdRef.current += 1
      isScanningRef.current = false
      if (!wasScanning) return

      const restore = scanRestoreSelectionRef.current
      if (restore?.accountId) {
        useWalletStore.setState({ activeAccountId: restore.accountId })
      }
      if (restore?.networkId) {
        void useWalletStore.getState().setActiveNetwork(restore.networkId, { skipRefresh: true }).catch(() => {})
      }
      scanRestoreSelectionRef.current = null
    }
  }, [])

  useEffect(() => {
    if (hasDirectRouteRequest || selectedId || selectedBatchKey) return
    const cached = readCachedScanRows()
    const cacheAgeMs = cached ? Math.max(0, Date.now() - cached.updatedAt) : Number.POSITIVE_INFINITY
    if (visibleScanRows.length === 0 && cached?.rows?.length) {
      setScanRows(cached.rows)
    }
    if ((!cached || cacheAgeMs > SEND_HUB_SCAN_STALE_MS || visibleScanRows.length === 0) && !isScanningRef.current) {
      void runGlobalScan({ mode: 'auto', reason: 'initial load', refreshBalances: true })
    }

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return
      void runGlobalScan({ mode: 'auto', reason: 'scheduled refresh', refreshBalances: false })
    }

    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return
      const latest = readCachedScanRows()
      const ageMs = latest ? Math.max(0, Date.now() - latest.updatedAt) : Number.POSITIVE_INFINITY
      if (!latest || ageMs > SEND_HUB_SCAN_STALE_MS) {
        void runGlobalScan({ mode: 'auto', reason: 'tab visible', refreshBalances: true })
      }
    }

    const intervalId = window.setInterval(tick, SEND_HUB_SCAN_AUTO_INTERVAL_MS)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }
    return () => {
      window.clearInterval(intervalId)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [hasDirectRouteRequest, runGlobalScan, selectedBatchKey, selectedId, visibleScanRows.length])

  useEffect(() => {
    const routeState = (location.state as SendRouteState | null) || null
    const requestedModeRaw = String(routeState?.hubMode || '').trim().toLowerCase()
    if (requestedModeRaw !== 'global') return

    if (routeState?.autoScan === true && visibleScanRows.length === 0 && !isScanningAll) {
      void runGlobalScan({ mode: 'auto', reason: 'global network entry' })
    }

    navigate('/wallet/send', { replace: true, state: null })
  }, [location.state, navigate, visibleScanRows.length, isScanningAll, runGlobalScan])

  useEffect(() => {
    const signature = enabledNetworks
      .map((network) => network.id)
      .sort((a, b) => a.localeCompare(b))
      .join('|')
    const previous = enabledNetworksSignatureRef.current
    enabledNetworksSignatureRef.current = signature
    if (!previous || previous === signature) return
    if (hasDirectRouteRequest || selectedId || selectedBatchKey) return
    void runGlobalScan({
      mode: 'auto',
      reason: 'enabled network list updated',
      refreshBalances: true,
      forceAssetRefresh: true
    })
  }, [enabledNetworks, hasDirectRouteRequest, runGlobalScan, selectedBatchKey, selectedId])

  const openSendFromScanHolder = async (holder: ScanHolder) => {
    setScanError('')
    // Stop any in-flight background scan before switching account/network for send.
    scanRunIdRef.current += 1
    isScanningRef.current = false
    setIsScanningAll(false)
    scanRestoreSelectionRef.current = null

    try {
      setSelectedBatchKey(null)
      setActiveAccount(holder.accountId)
      await setActiveNetwork(holder.networkId)
      const latestState = useWalletStore.getState()
      const candidates = latestState.getSendableItems({
        accountId: holder.accountId,
        networkId: holder.networkId,
        includeHidden: true,
        includeZeroBalance: false
      })
      const target = candidates.find((item) => (
        item.id === holder.itemId
        || (holder.assetId && item.assetId === holder.assetId)
      ))
      if (!target) {
        setScanError(`Cannot open send form for ${holder.label} on ${holder.networkSymbol}. Run scan again.`)
        return
      }
      setSelectedId(target.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setScanError(`Cannot prepare send form: ${message}`)
    }
  }

  const togglePinRow = (rowKey: string) => {
    const key = String(rowKey || '').trim()
    if (!key) return
    setHubPreferences((current) => {
      const pinned = new Set(normalizeKeyList(current.pinned))
      if (pinned.has(key)) pinned.delete(key)
      else pinned.add(key)
      return {
        order: normalizeKeyList(current.order),
        pinned: [...pinned]
      }
    })
  }

  const applyDragReorder = (draggedKey: string, targetKey: string) => {
    const dragged = String(draggedKey || '').trim()
    const target = String(targetKey || '').trim()
    if (!dragged || !target || dragged === target) return

    setHubPreferences((current) => {
      const currentOrderedKeys = applySendHubPreferences(scanRows, current).map((row) => row.key)
      const nextOrder = moveRowKeyBefore(currentOrderedKeys, dragged, target)
      return {
        order: normalizeKeyList(nextOrder),
        pinned: normalizeKeyList(current.pinned)
      }
    })
  }

  const handleRowDragStart = (rowKey: string, event: React.DragEvent<HTMLDivElement>) => {
    if (search.trim()) return
    const key = String(rowKey || '').trim()
    if (!key) return
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', key)
    setDraggingRowKey(key)
    setDragOverRowKey(null)
  }

  const handleRowDragOver = (rowKey: string, event: React.DragEvent<HTMLDivElement>) => {
    if (search.trim()) return
    if (!draggingRowKey || draggingRowKey === rowKey) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverRowKey(rowKey)
  }

  const handleRowDrop = (targetRowKey: string, event: React.DragEvent<HTMLDivElement>) => {
    if (search.trim()) return
    event.preventDefault()
    const dragged = String(draggingRowKey || event.dataTransfer.getData('text/plain') || '').trim()
    if (!dragged || dragged === targetRowKey) {
      setDragOverRowKey(null)
      setDraggingRowKey(null)
      return
    }
    applyDragReorder(dragged, targetRowKey)
    setDragOverRowKey(null)
    setDraggingRowKey(null)
  }

  const clearDragState = () => {
    setDragOverRowKey(null)
    setDraggingRowKey(null)
  }

  if (selectedBatchRow) {
    return (
      <SendBatchSweepForm
        row={selectedBatchRow}
        networkById={networkById}
        onBack={() => {
          setSelectedBatchKey(null)
        }}
        onComplete={() => {
          void runGlobalScan({ mode: 'manual', reason: 'post merged send', refreshBalances: true, forceAssetRefresh: true })
        }}
      />
    )
  }

  if (selectedItem) {
    return (
      <SendTransferForm
        item={selectedItem}
        onBack={() => {
          setSelectedId(null)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 border-b border-dark-600 flex items-center gap-3">
        <button onClick={() => navigate('/wallet/assets')} className="text-gray-400 hover:text-white transition-colors">
          <IoArrowBackOutline className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-gray-200">Send Hub</h1>
      </header>

      <div className="p-4 border-b border-dark-600/60 space-y-3">
        <div className="relative">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <Input
            placeholder="Search token, account, address, blockchain..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9 bg-dark-700/50 border-dark-600 text-sm"
          />
        </div>

        {scanError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2">
            <p className="text-[11px] font-bold text-red-300">{scanError}</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredScanRows.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center text-sm text-gray-400 gap-3">
            <p>
              {isScanningAll
                ? 'Loading global holdings...'
                : (search.trim()
                  ? `No scan rows for "${search}".`
                  : 'Global list auto-updates in background across all addresses and blockchains.')}
            </p>
          </div>
        )}

        {filteredScanRows.map((row) => {
          const expanded = expandedRows[row.key] === true
          const rowNetwork = networkById.get(row.networkId) || activeNetwork
          const rowCaps = resolveNetworkCapabilities(rowNetwork)
          const rowCanBatchSend = row.requestType === 'native'
            ? rowCaps.features.nativeSend
            : rowCaps.features.assetSend
          const rowPinned = pinnedRowKeys.has(row.key)
          return (
            <div
              key={row.key}
              draggable={!search.trim()}
              onDragStart={(event) => handleRowDragStart(row.key, event)}
              onDragOver={(event) => handleRowDragOver(row.key, event)}
              onDrop={(event) => handleRowDrop(row.key, event)}
              onDragEnd={clearDragState}
              className={`px-3 py-2 border-b border-dark-600/40 ${draggingRowKey === row.key ? 'opacity-60' : ''}`}
            >
              <button
                type="button"
                onClick={() => setExpandedRows((prev) => ({ ...prev, [row.key]: !expanded }))}
                className="w-full text-left flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full border border-dark-600 bg-dark-700/60 overflow-hidden flex items-center justify-center shrink-0">
                  {(() => {
                    const resolvedLogo = String(row.logoUrl || '').trim() || getTokenLogoForAsset(row.label || row.symbol)
                    return resolvedLogo
                      ? <img src={resolvedLogo} alt={row.label} className="w-full h-full object-cover" />
                      : <IoLayersOutline className="w-4.5 h-4.5 text-gray-300" />
                  })()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold truncate">{row.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-dark-500 text-gray-300 font-bold uppercase">
                      {row.holders.length} {row.holders.length === 1 ? 'holder' : 'holders'}
                    </span>
                    {rowPinned && (
                      <span
                        className="inline-flex items-center justify-center p-1 rounded-full border border-yellow-500/40 text-yellow-200"
                        aria-label="Pinned"
                        title="Pinned"
                      >
                        <IoPin className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                      {row.kind === 'native' ? row.networkSymbol : row.symbol}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-blue-500/30 bg-blue-500/10 text-[9px] font-bold uppercase text-blue-200">
                      {row.networkLogo
                        ? <img src={row.networkLogo} alt={row.networkSymbol} className="w-3 h-3 rounded-full object-cover" />
                        : <span className="w-2 h-2 rounded-full bg-blue-300" />}
                      {row.networkSymbol}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono">{formatUnits8(row.rawAmount / 1e8)}</p>
                  <div className="flex justify-end">
                    {expanded ? (
                      <IoChevronDownOutline className="w-4 h-4 text-gray-500" />
                    ) : (
                      <IoChevronForwardOutline className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="mt-2 space-y-2 pl-12">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => togglePinRow(row.key)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                        rowPinned
                          ? 'border-yellow-500/40 bg-yellow-500/20 text-yellow-200 hover:text-white'
                          : 'border-dark-500 bg-dark-700/40 text-gray-300 hover:text-white'
                      }`}
                    >
                      {rowPinned ? 'Unpin' : 'Pin to Top'}
                    </button>
                    {row.holders.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(null)
                          setSelectedBatchKey(row.key)
                        }}
                        disabled={!rowCanBatchSend}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border border-blue-400/40 bg-blue-500/20 text-blue-200 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Send All Holders
                      </button>
                    )}
                  </div>
                  {row.holders.map((holder) => {
                    const holderNetwork = networkById.get(holder.networkId)
                    const holderCaps = resolveNetworkCapabilities(holderNetwork || activeNetwork)
                    const holderCanSend = holder.requestType === 'native'
                      ? holderCaps.features.nativeSend
                      : holderCaps.features.assetSend
                    return (
                      <div key={holder.key} className="p-2 rounded-xl border border-dark-600 bg-dark-700/40 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">{holder.accountLabel}</p>
                          <p className="text-[10px] text-gray-500 font-mono truncate">{shortAddress(holder.address)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold font-mono">{holder.amount}</p>
                          <button
                            type="button"
                            onClick={() => void openSendFromScanHolder(holder)}
                            disabled={!holderCanSend}
                            className="mt-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border border-primary/40 bg-primary/20 text-primary hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Send
