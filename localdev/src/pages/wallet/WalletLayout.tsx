import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { WalletFrame } from '../../components/WalletFrame'
import {
  IoArrowUpOutline,
  IoCheckmarkCircle,
  IoClose,
  IoGridOutline,
  IoLayersOutline,
  IoPulseOutline,
  IoSearchOutline,
  IoSettingsOutline,
  IoSwapHorizontalOutline
} from 'react-icons/io5'
import { PageTransition } from '../../components/PageTransition'
import { resolveNetworkCapabilities, type NetworkCapabilitiesInput } from '../../lib/networkCapabilities'
import { coinModelFamilyToRouteKey, compareNetworksByModelFamily, resolveCoinModelFamily } from '../../lib/coinModel'
import { getModelIconRingClass } from '../../buildConfig'
import { getEnabledNetworks, getNetworkChainGroup, splitNetworksByChain } from '../../lib/networkVisibility'
import { isSwapActionEnabledNetwork } from '../../lib/swapEligibility'
import { MAX_ACTIVE_REFRESH_NETWORKS } from '../../store/walletStoreStateUtils'
import { normalizeActivityNetworkId } from '../../lib/txExplorer'
import { formatFiatValue, useWalletStore } from '../../store/walletStore'

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

export interface WalletLayoutOutletContext {
  openNetworkSheet: () => void
  openGlobalSendHub: () => void
  openModelPage: () => void
}

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
    setActiveNetwork,
    refreshActiveBalance,
    fetchNetworkFiat,
    getSendableItems
  } = useWalletStore()

  const [showNetworkSheet, setShowNetworkSheet] = useState(false)
  const [networkSearch, setNetworkSearch] = useState('')
  const [networkFilter, setNetworkFilter] = useState<'all' | 'main' | 'test'>('all')

  const enabledNetworks = useMemo(
    () => getEnabledNetworks(networks, disabledNetworkIds),
    [networks, disabledNetworkIds]
  )
  const enabledNetworkIds = useMemo(
    () => new Set(enabledNetworks.map((network) => network.id)),
    [enabledNetworks]
  )
  const enabledNetworkCount = enabledNetworks.length
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || accounts[0]
  const activeNetwork = enabledNetworks.find((network) => network.id === activeNetworkId) || enabledNetworks[0]
  const caps = activeNetwork ? networkCapabilities(activeNetwork) : resolveNetworkCapabilities({})
  const hasActiveNetwork = Boolean(activeNetwork)
  const displayBalance = formatBalanceDisplay(String(activeAccount?.balance || '0'))
  const fiatScopeKey = `${String(activeAccount?.id || '').trim().toLowerCase()}::${String(activeNetworkId || '').trim().toLowerCase()}`
  const portfolioFiatValue =
    accountNetworkFiatTotals[fiatScopeKey]?.usd
    ?? accountNetworkFiatNative[fiatScopeKey]?.usd
  const displayFiatValue = formatFiatValue(portfolioFiatValue)
  const activeNetworkSwapItems = useMemo(() => {
    if (!activeAccount?.id || !activeNetwork?.id) return []
    return getSendableItems({
      accountId: activeAccount.id,
      networkId: activeNetwork.id,
      includeHidden: false,
      includeZeroBalance: false
    })
  }, [activeAccount?.id, activeNetwork?.id, getSendableItems])
  const showSwapAction = Boolean(activeNetwork && isSwapActionEnabledNetwork(activeNetwork) && activeNetworkSwapItems.length > 0)
  const rankedNetworks = useMemo(() => {
    const usageByNetwork = new Map<string, number>()
    for (const row of activity) {
      const networkId = normalizeActivityNetworkId(String(row?.networkId || '').trim())
      if (!networkId) continue
      usageByNetwork.set(networkId, (usageByNetwork.get(networkId) || 0) + 1)
    }
    return [...networks].sort((a, b) => {
      const familyDelta = compareNetworksByModelFamily(a, b)
      if (familyDelta !== 0) return familyDelta
      const usageDelta =
        (usageByNetwork.get(normalizeActivityNetworkId(b.id)) || 0)
        - (usageByNetwork.get(normalizeActivityNetworkId(a.id)) || 0)
      if (usageDelta !== 0) return usageDelta
      return a.name.localeCompare(b.name)
    })
  }, [activity, networks])
  const visibleNetworks = useMemo(() => {
    const query = networkSearch.trim().toLowerCase()
    return rankedNetworks.filter((net) => {
      if (!enabledNetworkIds.has(net.id)) return false
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
  }, [enabledNetworkIds, networkFilter, networkSearch, rankedNetworks])
  const visibleNetworkGroups = useMemo(
    () => splitNetworksByChain(visibleNetworks),
    [visibleNetworks]
  )
  const isSendRoute = location.pathname.startsWith('/wallet/send')
  const isSwapRoute = location.pathname.startsWith('/wallet/swap')
  const isFocusedFlowRoute = isSendRoute || isSwapRoute
  const coinModel = activeNetwork ? resolveCoinModelFamily(activeNetwork) : 'generic'
  const coinModelRouteKey = coinModelFamilyToRouteKey(coinModel)
  const isModelRoute = location.pathname.startsWith('/wallet/model/')
  const expectedModelPath = `/wallet/model/${coinModelRouteKey}`
  const showWalletSummary = !isFocusedFlowRoute

  useEffect(() => {
    void fetchNetworkFiat()
  }, [activeNetworkId, fetchNetworkFiat])

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
  }, [refreshActiveBalance, activeNetworkId, isFocusedFlowRoute])

  useEffect(() => {
    if (!hasActiveNetwork || !isModelRoute) return
    if (location.pathname === expectedModelPath) return
    navigate(expectedModelPath, { replace: true })
  }, [expectedModelPath, hasActiveNetwork, isModelRoute, location.pathname, navigate])

  const closeNetworkSheet = () => {
    setShowNetworkSheet(false)
    setNetworkSearch('')
    setNetworkFilter('all')
  }

  const handleSelectNetwork = async (networkId: string) => {
    const target = networks.find((network) => network.id === networkId)
    if (!target || !enabledNetworkIds.has(target.id)) return

    await setActiveNetwork(target.id)
    closeNetworkSheet()
  }

  if (!hasActiveNetwork) {
    return (
      <WalletFrame>
        <div className="h-full flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-[280px] space-y-3 rounded-3xl border border-dark-600 bg-dark-800/70 px-5 py-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Wallet Unavailable</p>
            <p className="text-sm font-semibold text-gray-200">No enabled network is ready for this wallet session.</p>
            <p className="text-xs text-gray-500">
              Open blockchain settings and enable at least one chain, then reopen the wallet surface.
            </p>
            <button
              type="button"
              onClick={() => navigate('/settings/blockchains')}
              className="w-full rounded-2xl bg-primary px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-dark-950 transition-opacity hover:opacity-90"
            >
              Manage Blockchains
            </button>
          </div>
        </div>
      </WalletFrame>
    )
  }

  return (
    <WalletFrame hideHeader={isFocusedFlowRoute}>
      {showWalletSummary ? (
        <div className="shrink-0 px-4 pt-4">
          <section className="wallet-surface p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <button
                type="button"
                onClick={() => setShowNetworkSheet(true)}
                className="flex items-center gap-3 text-left transition-opacity hover:opacity-85"
              >
                {activeNetwork.logo ? (
                  <div className={clsx('h-12 w-12 overflow-hidden rounded-full border border-white/10', getModelIconRingClass(String(activeNetwork.runtimeModelId || activeNetwork.id || '')))}>
                    <img src={activeNetwork.logo} alt={activeNetwork.name} className="h-full w-full object-cover rounded-full" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/25 bg-primary/10">
                    <IoLayersOutline className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="wallet-eyebrow text-gray-400">Main Coin</p>
                  <p className="mt-1 text-sm font-semibold text-gray-100">{activeNetwork.name}</p>
                  <p className="text-xs text-gray-500">{activeNetwork.symbol} - Tap to change network</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate(`/wallet/model/${coinModelRouteKey}`)}
                className="wallet-chip rounded-[18px] px-3 py-2 normal-case tracking-normal"
              >
                Open Coin Page
              </button>
            </div>

            <div className="mt-5">
              <div className="flex items-end gap-2">
                <span className="text-[2rem] font-bold tracking-tight text-gray-100">{displayBalance}</span>
                <span className="pb-1 text-lg font-semibold text-gray-400">{activeNetwork.symbol}</span>
              </div>
              {displayFiatValue ? (
                <p className="mt-1 text-sm font-medium text-gray-400">{displayFiatValue}</p>
              ) : (
                <p className="mt-1 text-sm font-medium text-gray-500">No fiat quote available</p>
              )}
            </div>

          </section>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-hidden">
        <PageTransition>
          <Outlet
            context={{
              openNetworkSheet: () => setShowNetworkSheet(true),
              openGlobalSendHub: () => navigate('/wallet/send', { state: { hubMode: 'global', autoScan: true } }),
              openModelPage: () => navigate(`/wallet/model/${coinModelRouteKey}`)
            } satisfies WalletLayoutOutletContext}
          />
        </PageTransition>
      </div>

      {!isFocusedFlowRoute ? (
        <WalletBottomNav
          pathname={location.pathname}
          onAssets={() => navigate('/wallet/assets')}
          onSend={() => navigate('/wallet/send', {
            state: {
              quickSendNative: true,
              returnTo: `${location.pathname}${location.search}`,
              returnLabel: 'Wallet'
            }
          })}
          onSwap={() => navigate('/wallet/swap')}
          onActivity={() => navigate('/wallet/activity')}
          onSettings={() => navigate('/settings')}
          showAssets={caps.ui.showAssetsTab}
          showSwap={showSwapAction}
          showActivity={caps.ui.showActivityTab}
        />
      ) : null}

      {showNetworkSheet && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-end"
          onClick={closeNetworkSheet}
        >
          <div
            className="w-full max-w-[460px] min-h-[68vh] bg-dark-800 rounded-t-3xl border-t border-dark-600 p-6 space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Select Network</h3>
              <button onClick={closeNetworkSheet}>
                <IoClose className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="relative">
              <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={networkSearch}
                onChange={(event) => setNetworkSearch(event.target.value)}
                placeholder="Search networks..."
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
              Showing enabled networks only. Active: {enabledNetworkCount} / {MAX_ACTIVE_REFRESH_NETWORKS}. Use Manage to review disabled or hidden chains.
            </p>

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
                      <span className="text-[10px] text-gray-600">{section.rows.length}</span>
                    </div>
                    {section.rows.map((net) => (
                      <button
                        key={net.id}
                        onClick={() => { void handleSelectNetwork(net.id) }}
                        className={clsx(
                          'w-full flex items-center justify-between p-3 rounded-xl border transition-all',
                          net.id === activeNetworkId
                            ? 'border-primary bg-primary/10'
                            : 'border-dark-600 bg-dark-700/50 hover:bg-dark-700'
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
                            <span className="text-sm font-bold">{net.name}</span>
                            <span className="text-[10px] text-gray-500 uppercase font-mono">{net.symbol}</span>
                          </div>
                        </div>
                        {net.id === activeNetworkId ? <IoCheckmarkCircle className="w-5 h-5 text-primary shrink-0" /> : null}
                      </button>
                    ))}
                  </div>
                ) : null
              ))}
              {visibleNetworks.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">No networks match "{networkSearch}"</p>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )}
    </WalletFrame>
  )
}

interface WalletBottomNavProps {
  pathname: string
  onAssets: () => void
  onSend: () => void
  onSwap: () => void
  onActivity: () => void
  onSettings: () => void
  showAssets: boolean
  showSwap: boolean
  showActivity: boolean
}

const WalletBottomNav: React.FC<WalletBottomNavProps> = ({
  pathname,
  onAssets,
  onSend,
  onSwap,
  onActivity,
  onSettings,
  showAssets,
  showSwap,
  showActivity
}) => {
  const items = [
    showAssets
      ? {
          id: 'assets',
          label: 'Assets',
          active: pathname.startsWith('/wallet/assets') || pathname === '/assets',
          onClick: onAssets,
          icon: <IoGridOutline className="h-4.5 w-4.5" />
        }
      : null,
    {
      id: 'send',
      label: 'Send',
      active: pathname.startsWith('/wallet/send'),
      onClick: onSend,
      icon: <IoArrowUpOutline className="h-4.5 w-4.5" />
    },
    showSwap
      ? {
          id: 'swap',
          label: 'Swap',
          active: pathname.startsWith('/wallet/swap'),
          onClick: onSwap,
          icon: <IoSwapHorizontalOutline className="h-4.5 w-4.5" />
        }
      : null,
    showActivity
      ? {
          id: 'activity',
          label: 'Activity',
          active: pathname.startsWith('/wallet/activity'),
          onClick: onActivity,
          icon: <IoPulseOutline className="h-4.5 w-4.5" />
        }
      : null,
    {
      id: 'settings',
      label: 'Settings',
      active: pathname.startsWith('/settings'),
      onClick: onSettings,
      icon: <IoSettingsOutline className="h-4.5 w-4.5" />
    }
  ].filter(Boolean) as Array<{
    id: string
    label: string
    active: boolean
    onClick: () => void
    icon: React.ReactNode
  }>

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <nav className="rounded-[30px] border border-white/8 bg-[#191a22]/94 px-2 py-2 shadow-[0_24px_40px_rgba(15,23,42,0.24)] backdrop-blur-xl">
        <div className="flex items-center gap-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={clsx(
                'relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[22px] px-2 py-2.5 text-[10px] font-bold tracking-[0.12em] transition-all',
                item.active
                  ? 'bg-gradient-to-br from-[#ff9d55] via-[#ff7f2a] to-[#ff6800] text-white shadow-[0_12px_24px_rgba(255,104,0,0.32)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
              {item.active ? <span className="h-1.5 w-1.5 rounded-full bg-white/90" /> : null}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default WalletLayout
