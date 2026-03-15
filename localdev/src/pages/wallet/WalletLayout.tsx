import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { WalletFrame } from '../../components/WalletFrame'
import { formatFiatValue, useWalletStore } from '../../store/walletStore'
import {
  IoArrowUpOutline,
  IoClose,
  IoCheckmarkCircle,
  IoCopyOutline,
  IoCheckmark,
  IoLayersOutline,
  IoSearchOutline,
  IoSettingsOutline,
  IoSwapHorizontalOutline
} from 'react-icons/io5'
import { Tabs } from '../../components/Tabs'
import { PageTransition } from '../../components/PageTransition'
import { resolveNetworkCapabilities, type NetworkCapabilitiesInput } from '../../lib/networkCapabilities'
import { getAccountDisplayName } from '../../lib/accountName'
import { resolveCoinModelFamily, coinModelFamilyToRouteKey, compareNetworksByModelFamily } from '../../lib/coinModel'
import { getModelIconFrameClass, getModelIconRingClass, getModelStatus } from '../../buildConfig'
import { getEnabledNetworks, getNetworkChainGroup, splitNetworksByChain } from '../../lib/networkVisibility'
import { MAX_ACTIVE_REFRESH_NETWORKS } from '../../store/walletStoreStateUtils'

// ── helpers ──────────────────────────────────────────────────────────────────

/** Returns normalized, spec-driven capabilities for the selected network. */
function networkCapabilities(net: { supportsAssets?: boolean; coinType: string; capabilities?: NetworkCapabilitiesInput }) {
  return resolveNetworkCapabilities(net)
}

function formatBalanceDisplay(value: string): string {
  const raw = String(value || '').trim()
  if (!raw) return '0'
  const num = Number(raw)
  if (!Number.isFinite(num)) return raw
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8
  })
}

// ── main component ────────────────────────────────────────────────────────────

const WalletLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    accounts,
    activeAccountId,
    networks,
    disabledNetworkIds,
    activeNetworkId,
    accountNetworkFiatTotals,
    accountNetworkFiatNative,
    activity,
    setActiveAccount,
    setActiveNetwork,
    setNetworkEnabled,
    refreshActiveBalance,
    fetchNetworkFiat
  } = useWalletStore()

  // ── sheet visibility ──────────────────────────────────────────────────────
  const [showAccountSheet, setShowAccountSheet] = useState(false)
  const [showNetworkSheet, setShowNetworkSheet]   = useState(false)
  const [networkSearch,    setNetworkSearch]       = useState('')
  const [networkFilter,    setNetworkFilter]       = useState<'all' | 'main' | 'test'>('all')

  // ── copy feedback ──────────────────────────────────────────────────────────
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyAddress = async (id: string, addr: string) => {
    try {
      await navigator.clipboard.writeText(addr)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* clipboard may be unavailable */ }
  }

  const enabledNetworks = useMemo(
    () => getEnabledNetworks(networks, disabledNetworkIds),
    [networks, disabledNetworkIds]
  )
  const enabledNetworkIds = useMemo(
    () => new Set(enabledNetworks.map((network) => network.id)),
    [enabledNetworks]
  )
  const enabledNetworkCount = enabledNetworks.length
  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0]
  const activeNetwork = enabledNetworks.find(n => n.id === activeNetworkId) || enabledNetworks[0]
  const displayBalance = formatBalanceDisplay(String(activeAccount?.balance || '0'))
  const fiatScopeKey = `${String(activeAccount?.id || '').trim().toLowerCase()}::${String(activeNetworkId || '').trim().toLowerCase()}`
  const portfolioFiatValue =
    accountNetworkFiatTotals[fiatScopeKey]?.usd
    ?? accountNetworkFiatNative[fiatScopeKey]?.usd
  const displayFiatValue = formatFiatValue(portfolioFiatValue)
  const rankedNetworks = useMemo(() => {
    const usageByNetwork = new Map<string, number>()
    for (const row of activity) {
      const networkId = String(row?.networkId || '').trim()
      if (!networkId) continue
      usageByNetwork.set(networkId, (usageByNetwork.get(networkId) || 0) + 1)
    }
    return [...networks].sort((a, b) => {
      const familyDelta = compareNetworksByModelFamily(a, b)
      if (familyDelta !== 0) return familyDelta
      const usageDelta = (usageByNetwork.get(b.id) || 0) - (usageByNetwork.get(a.id) || 0)
      if (usageDelta !== 0) return usageDelta
      return a.name.localeCompare(b.name)
    })
  }, [activity, networks])
  const visibleNetworks = useMemo(() => {
    const query = networkSearch.trim().toLowerCase()
    return rankedNetworks.filter((net) => {
      if (
        query
        && !net.name.toLowerCase().includes(query)
        && !net.symbol.toLowerCase().includes(query)
        && !String(net.serverCoinId || '').toLowerCase().includes(query)
      ) {
        return false
      }
      if (networkFilter === 'all') return true
      return getNetworkChainGroup(net) === networkFilter
    })
  }, [networkFilter, networkSearch, rankedNetworks])
  const visibleNetworkGroups = useMemo(
    () => splitNetworksByChain(visibleNetworks),
    [visibleNetworks]
  )
  const isSendRoute = location.pathname.startsWith('/wallet/send')
  const isSwapRoute = location.pathname.startsWith('/wallet/swap')
  const isFocusedFlowRoute = isSendRoute || isSwapRoute
  // Balance refresh (visibility-aware to avoid bridge/RPC spam while the extension surface is hidden)
  useEffect(() => {
    void fetchNetworkFiat()
  }, [activeAccountId, activeNetworkId, fetchNetworkFiat])

  useEffect(() => {
    if (isFocusedFlowRoute) return

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return
      void refreshActiveBalance()
    }

    tick()
    const intervalId = window.setInterval(tick, 15_000)
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') tick()
    }
    window.addEventListener('online', tick)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('online', tick)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [refreshActiveBalance, activeAccountId, activeNetworkId, isFocusedFlowRoute])

  // ── tabs — only show Assets if the network supports token assets ───────────
  const caps = networkCapabilities(activeNetwork)
  const coinModel = resolveCoinModelFamily(activeNetwork)
  const coinModelRouteKey = coinModelFamilyToRouteKey(coinModel)
  const isModelRoute = location.pathname.startsWith('/wallet/model/')
  const expectedModelPath = `/wallet/model/${coinModelRouteKey}`
  const TABS = [
    ...(caps.ui.showAssetsTab ? [{ id: 'assets', label: 'Assets' }] : []),
    ...(caps.ui.showActivityTab ? [{ id: 'activity', label: 'Activity' }] : [])
  ]

  const activeTab = isFocusedFlowRoute
    ? ''
    : isModelRoute
    ? ''
    : location.pathname.includes('/activity')
    ? 'activity'
    : (caps.ui.showAssetsTab ? 'assets' : 'activity')

  const handleTabChange = (id: string) => navigate(`/wallet/${id}`)

  const closeNetworkSheet = () => {
    setShowNetworkSheet(false)
    setNetworkSearch('')
    setNetworkFilter('all')
  }

  const handleSelectNetwork = async (networkId: string) => {
    const target = networks.find((network) => network.id === networkId)
    if (!target) return
    const isEnabled = enabledNetworkIds.has(target.id)

    if (!isEnabled) {
      const modelStatus = getModelStatus(String(target.runtimeModelId || target.id || ''))
      if (modelStatus !== 'tested' || enabledNetworkCount >= MAX_ACTIVE_REFRESH_NETWORKS) {
        closeNetworkSheet()
        navigate('/settings/blockchains')
        return
      }
      setNetworkEnabled(target.id, true)
    }

    await setActiveNetwork(target.id)
    closeNetworkSheet()
  }

  useEffect(() => {
    if (!isModelRoute) return
    if (location.pathname === expectedModelPath) return
    navigate(expectedModelPath, { replace: true })
  }, [isModelRoute, location.pathname, expectedModelPath, navigate])

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <WalletFrame hideHeader={isFocusedFlowRoute}>
      {!isFocusedFlowRoute && (
        <div className="flex flex-col items-center pt-3 pb-4 shrink-0">
        {/* Coin logo */}
        <button
          type="button"
          onClick={() => setShowNetworkSheet(true)}
          className={clsx(
            'w-14 h-14 rounded-full bg-primary/10 border-2 flex items-center justify-center overflow-hidden mb-2 transition-transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2 focus:ring-offset-dark-800',
            getModelIconFrameClass(activeNetwork.id)
          )}
          title="Change network"
        >
          {activeNetwork.logo
            ? <img src={activeNetwork.logo} alt={activeNetwork.name} className="w-full h-full object-cover rounded-full" />
            : <img src="/MetayoshiLogo.png" alt="MetaYoshi" className="w-full h-full object-contain object-center scale-[1.05] translate-y-[1px]" />
          }
        </button>
        <button
          type="button"
          onClick={() => setShowNetworkSheet(true)}
          className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 transition-colors hover:text-gray-300"
        >
          Tap logo to change network
        </button>

        {/* Balance */}
        <div className="mb-3 w-full px-4">
          <div className="mx-auto max-w-full text-center">
            <p className="text-[clamp(1.3rem,7.1vw,1.95rem)] font-bold leading-tight tracking-tight break-words">
              {displayBalance}
            </p>
            <p className="text-base font-semibold uppercase tracking-wide text-gray-300 mt-0.5">
              {activeNetwork.symbol}
            </p>
            {displayFiatValue && (
              <p className="text-sm font-medium text-gray-400 mt-1">
                {displayFiatValue}
              </p>
            )}
          </div>
        </div>

        {/* Quick-action buttons */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-4 w-full px-6 mb-3">
          {caps.ui.showAssetsAction && (
            <QuickAction
              icon={<IoLayersOutline className="w-5 h-5" />}
              label="Assets"
              onClick={() => navigate('/assets')}
            />
          )}
          {caps.ui.showSendAction && (
            <QuickAction
              icon={<IoArrowUpOutline className="w-5 h-5" />}
              label="Send"
              onClick={() => navigate('/wallet/send', { state: { quickSendNative: true } })}
            />
          )}
          <QuickAction
            icon={<IoSwapHorizontalOutline className="w-5 h-5" />}
            label="Swap"
            onClick={() => navigate('/wallet/swap')}
          />
          <QuickAction
            icon={<IoSearchOutline className="w-5 h-5" />}
            label="Model"
            onClick={() => navigate(`/wallet/model/${coinModelRouteKey}`)}
          />
          <QuickAction
            icon={<IoSettingsOutline className="w-5 h-5" />}
            label="Settings"
            onClick={() => navigate('/settings')}
          />
        </div>
        </div>
      )}

      {/* Tabs — hidden on dedicated send route */}
      {!isFocusedFlowRoute && <Tabs tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />}

      <div className="flex-1 min-h-0 overflow-hidden">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>

      {/* ══ Account bottom sheet ════════════════════════════════════════════ */}
      {showAccountSheet && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-end"
          onClick={() => setShowAccountSheet(false)}
        >
          <div
            className="w-full max-w-[380px] bg-dark-800 rounded-t-3xl border-t border-dark-600 p-6 space-y-3 animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Accounts</h3>
              <button onClick={() => setShowAccountSheet(false)}>
                <IoClose className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            {accounts.map(acc => {
              const addr = acc.networkAddresses?.[activeNetworkId]
                || (activeNetwork.coinType === 'EVM' ? acc.addresses?.EVM : '')
                || ''
              const isCopied = copiedId === acc.id

              return (
                <div
                  key={acc.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    acc.id === activeAccountId
                      ? 'border-primary bg-primary/10'
                      : 'border-dark-600 bg-dark-700/50'
                  }`}
                >
                  {/* Account info — click selects */}
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    onClick={() => { setActiveAccount(acc.id); setShowAccountSheet(false) }}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-yellow-400 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold">{getAccountDisplayName(acc, activeNetworkId, acc.name)}</span>
                      <span className="text-[10px] text-gray-500 font-mono truncate max-w-[160px]">
                        {addr ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : '—'}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    {acc.id === activeAccountId && (
                      <IoCheckmarkCircle className="w-4 h-4 text-primary" />
                    )}
                    {/* Copy address — click copies full address */}
                    <button
                      onClick={() => addr && void copyAddress(acc.id, addr)}
                      className="p-1.5 rounded-lg hover:bg-dark-600 transition-colors"
                      title="Copy full address"
                    >
                      {isCopied
                        ? <IoCheckmark className="w-4 h-4 text-green-400" />
                        : <IoCopyOutline className="w-4 h-4 text-gray-400 hover:text-white" />
                      }
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>,
        document.body
      )}

      {/* ══ Network bottom sheet ════════════════════════════════════════════ */}
      {showNetworkSheet && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-end"
          onClick={closeNetworkSheet}
        >
          <div
            className="w-full max-w-[460px] min-h-[68vh] bg-dark-800 rounded-t-3xl border-t border-dark-600 p-6 space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Select Network</h3>
              <button onClick={closeNetworkSheet}>
                <IoClose className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={networkSearch}
                onChange={e => setNetworkSearch(e.target.value)}
                placeholder="Search networks…"
                className="w-full bg-dark-700/60 border border-dark-600 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'main', label: 'Mainnet' },
                { id: 'test', label: 'Testnet' }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setNetworkFilter(option.id as 'all' | 'main' | 'test')}
                  className={clsx(
                    'rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition-colors',
                    networkFilter === option.id
                      ? 'border-primary/50 bg-primary/15 text-primary'
                      : 'border-dark-600 bg-dark-700/40 text-gray-400 hover:text-gray-200'
                  )}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  closeNetworkSheet()
                  navigate('/settings/blockchains')
                }}
                className="ml-auto rounded-full border border-dark-600 bg-dark-700/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 transition-colors hover:text-gray-200"
              >
                Manage
              </button>
            </div>

            <p className="text-[10px] text-gray-500">
              Enabled: {enabledNetworkCount} / {MAX_ACTIVE_REFRESH_NETWORKS}. Disabled networks stay visible here; untested or capacity-limited ones are managed in blockchain settings.
            </p>

            {/* List */}
            <div className="space-y-2 max-h-[52vh] overflow-y-auto custom-scrollbar pr-1">
              <button
                type="button"
                onClick={() => {
                  closeNetworkSheet()
                  navigate('/wallet/send', { state: { hubMode: 'global', autoScan: true } })
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-dark-600 bg-dark-700/50 hover:bg-dark-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <IoLayersOutline className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-bold text-gray-100">Global Send Hub</span>
                    <span className="text-[10px] text-gray-500">Open the all-networks send hub view</span>
                  </div>
                </div>
              </button>
              {[
                { key: 'main', label: 'Mainnet', rows: visibleNetworkGroups.main },
                { key: 'test', label: 'Testnet', rows: visibleNetworkGroups.test }
              ].map((section) => (
                section.rows.length > 0 ? (
                  <div key={section.key} className="space-y-2">
                    <div className="flex items-center justify-between px-1 pt-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                        {section.label}
                      </span>
                      <span className="text-[10px] text-gray-600">
                        {section.rows.length}
                      </span>
                    </div>
                    {section.rows.map(net => (
                      <button
                        key={net.id}
                        onClick={() => { void handleSelectNetwork(net.id) }}
                        className={clsx(
                          'w-full flex items-center justify-between p-3 rounded-xl border transition-all',
                          net.id === activeNetworkId
                            ? 'border-primary bg-primary/10'
                            : enabledNetworkIds.has(net.id)
                              ? 'border-dark-600 bg-dark-700/50 hover:bg-dark-700'
                              : 'border-dark-600/70 bg-dark-800/70 hover:bg-dark-700/70 opacity-90'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {net.logo
                            ? (
                              <div className={clsx('w-7 h-7 rounded-full overflow-hidden', getModelIconRingClass(String(net.runtimeModelId || net.id || '')))}>
                                <img src={net.logo} alt={net.name} className="w-full h-full object-cover rounded-full" />
                              </div>
                            )
                            : <div className="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /></div>
                          }
                          <div className="flex flex-col items-start">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">{net.name}</span>
                              <span className={clsx(
                                'px-1.5 py-0.5 rounded-md border text-[9px] font-black tracking-widest uppercase',
                                getNetworkChainGroup(net) === 'test'
                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                              )}>
                                {getNetworkChainGroup(net) === 'test' ? 'Testnet' : 'Mainnet'}
                              </span>
                              {networkCapabilities(net).features.assetLayer && (
                                <span
                                  title="Supports assets/tokens"
                                  className="px-1.5 py-0.5 rounded-md border border-dark-600 bg-dark-700/70 text-[9px] font-black tracking-widest uppercase text-gray-200"
                                >
                                  Assets
                                </span>
                              )}
                              {!enabledNetworkIds.has(net.id) && (
                                <span className="px-1.5 py-0.5 rounded-md border border-dark-600 bg-dark-800/80 text-[9px] font-black tracking-widest uppercase text-gray-400">
                                  Disabled
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500 uppercase font-mono">{net.symbol}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!enabledNetworkIds.has(net.id) && (
                            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">
                              {getModelStatus(String(net.runtimeModelId || net.id || '')) === 'tested' && enabledNetworkCount < MAX_ACTIVE_REFRESH_NETWORKS
                                ? 'Enable'
                                : 'Settings'}
                            </span>
                          )}
                          {net.id === activeNetworkId && (
                            <IoCheckmarkCircle className="w-5 h-5 text-primary shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null
              ))}
              {visibleNetworks.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">No networks match "{networkSearch}"</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </WalletFrame>
  )
}

// ── Quick-action button ────────────────────────────────────────────────────

interface QuickActionProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onClick, disabled = false }) => (
  <button
    className="flex flex-col items-center gap-1.5 group disabled:opacity-50 disabled:cursor-not-allowed"
    onClick={onClick}
    disabled={disabled}
  >
    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center transition-transform group-active:scale-90 shadow-lg shadow-primary/20">
      {icon}
    </div>
    <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{label}</span>
  </button>
)

export default WalletLayout

