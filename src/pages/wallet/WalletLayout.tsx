import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { WalletFrame } from '../../components/WalletFrame'
import { useWalletStore } from '../../store/walletStore'
import {
  IoArrowUpOutline,
  IoClose,
  IoCheckmarkCircle,
  IoCopyOutline,
  IoCheckmark,
  IoLayersOutline,
  IoSearchOutline
} from 'react-icons/io5'
import { Tabs } from '../../components/Tabs'
import { PageTransition } from '../../components/PageTransition'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { resolveNetworkCapabilities, type NetworkCapabilitiesInput } from '../../lib/networkCapabilities'
import { getSendBlockedSyncReason, isSendBlockedBySync } from '../../lib/sendSyncPolicy'
import { getAccountDisplayName } from '../../lib/accountName'
import { resolveCoinModelFamily, coinModelFamilyToRouteKey } from '../../lib/coinModel'
import {
  DONATION_ENABLED_DEFAULT,
  DONATION_PERCENT_DEFAULT,
  fetchCoinDonationPolicy,
  supportsCoinDonationPolicy,
  type CoinDonationPolicy
} from '../../coins/donationPolicy'

// ── helpers ──────────────────────────────────────────────────────────────────

/** Returns normalized, spec-driven capabilities for the selected network. */
function networkCapabilities(net: { supportsAssets?: boolean; coinType: string; capabilities?: NetworkCapabilitiesInput }) {
  return resolveNetworkCapabilities(net)
}

function formatCoinAmount(v: number): string {
  return v.toFixed(8).replace(/\.?0+$/, '')
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

function estimateNativeSendFee(network: { coinType: string; feePerByte?: number }): number {
  if (network.coinType === 'UTXO') {
    const rawFeePerByteCoins = Number(network.feePerByte ?? 0.0000002)
    let feePerByteSats = Math.max(1, Math.round(rawFeePerByteCoins * 1e8))
    if (feePerByteSats > 500) feePerByteSats = Math.max(1, Math.round(feePerByteSats / 1000))
    // Mirrors simple send sizing used in wallet send flow.
    const estimatedBytes = 10 + (148 * 2) + (34 * 3)
    return (estimatedBytes * feePerByteSats) / 1e8
  }
  if (network.coinType === 'XRP') return 0.000012
  // Conservative fallback for non-UTXO/non-XRP networks.
  return 0.002151
}

// ── main component ────────────────────────────────────────────────────────────

const WalletLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    accounts,
    activeAccountId,
    networks,
    activeNetworkId,
    activity,
    setActiveAccount,
    setActiveNetwork,
    refreshActiveBalance,
    donationPercent: donationPercentSetting,
    isConnected,
    isSyncing,
    syncPercent,
    lowSyncStreak
  } = useWalletStore()

  // ── sheet visibility ──────────────────────────────────────────────────────
  const [showAccountSheet, setShowAccountSheet] = useState(false)
  const [showNetworkSheet, setShowNetworkSheet]   = useState(false)
  const [showSendSheet,    setShowSendSheet]       = useState(false)
  const [networkSearch,    setNetworkSearch]       = useState('')

  // ── copy feedback ──────────────────────────────────────────────────────────
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyAddress = async (id: string, addr: string) => {
    try {
      await navigator.clipboard.writeText(addr)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* clipboard may be unavailable */ }
  }

  // ── send form state ────────────────────────────────────────────────────────
  const [toAddress, setToAddress] = useState('')
  const [amount,    setAmount]    = useState('')
  const [sendError, setSendError] = useState('')
  const [donationEnabled, setDonationEnabled] = useState(DONATION_ENABLED_DEFAULT)
  const [donationMode, setDonationMode] = useState<'add' | 'deduct'>('add')
  const [donationPolicy, setDonationPolicy] = useState<CoinDonationPolicy | null>(null)

  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0]
  const activeNetwork = networks.find(n => n.id === activeNetworkId) || networks[0]
  const displayBalance = formatBalanceDisplay(String(activeAccount?.balance || '0'))
  const rankedNetworks = useMemo(() => {
    const usageByNetwork = new Map<string, number>()
    for (const row of activity) {
      const networkId = String(row?.networkId || '').trim()
      if (!networkId) continue
      usageByNetwork.set(networkId, (usageByNetwork.get(networkId) || 0) + 1)
    }
    return [...networks].sort((a, b) => {
      const usageDelta = (usageByNetwork.get(b.id) || 0) - (usageByNetwork.get(a.id) || 0)
      if (usageDelta !== 0) return usageDelta
      return a.name.localeCompare(b.name)
    })
  }, [activity, networks])
  const visibleNetworks = useMemo(() => {
    const query = networkSearch.trim().toLowerCase()
    if (!query) return rankedNetworks
    return rankedNetworks.filter((net) =>
      net.name.toLowerCase().includes(query) || net.symbol.toLowerCase().includes(query)
    )
  }, [networkSearch, rankedNetworks])
  const donationSupported = supportsCoinDonationPolicy(activeNetwork)
  const donationRequired = donationSupported ? donationPolicy?.required === true : false
  const donationPercent = donationSupported
    ? (donationRequired ? (donationPolicy?.percent ?? DONATION_PERCENT_DEFAULT) : donationPercentSetting)
    : 0
  const donationAddress = donationSupported ? String(donationPolicy?.address || '').trim() : ''
  const donationActive = donationSupported && donationEnabled && Boolean(donationAddress)
  const numericAmount = Number(amount)
  const enteredAmount = Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : 0
  const donationAmount = donationActive
    ? (enteredAmount * donationPercent) / 100
    : 0
  const recipientAmount = donationActive && donationMode === 'deduct'
    ? Math.max(0, enteredAmount - donationAmount)
    : enteredAmount
  const spendBeforeNetworkFee = donationActive && donationMode === 'add'
    ? enteredAmount + donationAmount
    : enteredAmount
  const totalOutputsSpend = recipientAmount + (donationActive ? donationAmount : 0)

  // Per-network address for the active account
  const activeAddress = activeAccount?.networkAddresses?.[activeNetworkId]
    || (activeNetwork.coinType === 'EVM' ? activeAccount?.addresses?.EVM : '')
    || ''

  // Balance refresh
  useEffect(() => {
    void refreshActiveBalance()
    const t = window.setInterval(() => void refreshActiveBalance(), 10_000)
    return () => window.clearInterval(t)
  }, [refreshActiveBalance, activeAccountId, activeNetworkId])

  // Reset send form when sheet closes
  useEffect(() => {
    if (!showSendSheet) {
      setToAddress('')
      setAmount('')
      setSendError('')
      setDonationEnabled(DONATION_ENABLED_DEFAULT)
      setDonationMode('add')
      setDonationPolicy(null)
    }
  }, [showSendSheet])

  useEffect(() => {
    if (!showSendSheet || !donationSupported) return
    let cancelled = false
    void fetchCoinDonationPolicy(activeNetwork).then((policy) => {
      if (cancelled) return
      setDonationPolicy(policy)
      if (policy?.required) {
        setDonationEnabled(true)
      } else if (!String(policy?.address || '').trim()) {
        setDonationEnabled(false)
      } else if (policy && !policy.enabled) {
        setDonationEnabled(false)
      }
    })
    return () => { cancelled = true }
  }, [showSendSheet, donationSupported, activeNetwork])

  // ── tabs — only show Assets if the network supports token assets ───────────
  const caps = networkCapabilities(activeNetwork)
  const coinModel = resolveCoinModelFamily(activeNetwork)
  const coinModelRouteKey = coinModelFamilyToRouteKey(coinModel)
  const isModelRoute = location.pathname.startsWith('/wallet/model/')
  const expectedModelPath = `/wallet/model/${coinModelRouteKey}`
  const sendBlockedBySync = isSendBlockedBySync(isSyncing, syncPercent, isConnected, lowSyncStreak)
  const syncBlockedReason = getSendBlockedSyncReason(isSyncing, syncPercent, isConnected, lowSyncStreak)
  const TABS = [
    ...(caps.ui.showAssetsTab ? [{ id: 'assets', label: 'Assets' }] : []),
    ...(caps.ui.showActivityTab ? [{ id: 'activity', label: 'Activity' }] : [])
  ]

  const activeTab = isModelRoute
    ? ''
    : location.pathname.includes('/activity')
    ? 'activity'
    : (caps.ui.showAssetsTab ? 'assets' : 'activity')

  const handleTabChange = (id: string) => navigate(`/wallet/${id}`)

  useEffect(() => {
    if (!isModelRoute) return
    if (location.pathname === expectedModelPath) return
    navigate(expectedModelPath, { replace: true })
  }, [isModelRoute, location.pathname, expectedModelPath, navigate])

  // ── send submit ────────────────────────────────────────────────────────────
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    setSendError('')
    if (!caps.features.nativeSend) {
      setSendError(`${activeNetwork.name} does not support native coin transfers in this wallet`)
      return
    }
    if (sendBlockedBySync) {
      setSendError(syncBlockedReason)
      return
    }

    if (!toAddress.trim()) { setSendError('Recipient address is required'); return }
    if (!amount || parseFloat(amount) <= 0) { setSendError('Amount must be greater than 0'); return }

    let effectiveDonationEnabled = donationSupported && donationEnabled
    if (effectiveDonationEnabled && !donationAddress) {
      if (donationRequired) {
        setSendError('Donation address missing from server policy/config')
        return
      }
      effectiveDonationEnabled = false
      setDonationEnabled(false)
    }
    if (effectiveDonationEnabled && donationRequired) setDonationEnabled(true)

    const effectiveDonationAmount = effectiveDonationEnabled ? donationAmount : 0
    const effectiveRecipientAmount = effectiveDonationEnabled && donationMode === 'deduct'
      ? Math.max(0, enteredAmount - effectiveDonationAmount)
      : enteredAmount
    const effectiveSpendBeforeNetworkFee = effectiveDonationEnabled && donationMode === 'add'
      ? enteredAmount + effectiveDonationAmount
      : enteredAmount
    const effectiveTotalOutputsSpend = effectiveRecipientAmount + effectiveDonationAmount

    if (effectiveDonationEnabled && donationMode === 'deduct' && effectiveRecipientAmount <= 0) {
      setSendError(`Amount is too low for a ${donationPercent}% donation in deduct mode`)
      return
    }

    if (effectiveTotalOutputsSpend > parseFloat(activeAccount?.balance || '0')) {
      setSendError('Insufficient balance'); return
    }

    const fromAddress = activeNetwork.coinType === 'EVM'
      ? (activeAccount?.addresses.EVM || '')
      : (activeAccount?.networkAddresses?.[activeNetwork.id] || '')

    setShowSendSheet(false)
    navigate('/tx/confirm', {
      state: {
        to: toAddress,
        amount: formatCoinAmount(effectiveRecipientAmount),
        from: fromAddress,
        enteredAmount: formatCoinAmount(enteredAmount),
        donationEnabled: effectiveDonationEnabled,
        donationPercent,
        donationMode,
        donationAmount: formatCoinAmount(effectiveDonationAmount),
        donationAddress,
        donationRequired,
        totalBeforeNetworkFee: formatCoinAmount(effectiveSpendBeforeNetworkFee)
      }
    })
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <WalletFrame>
      <div className="flex flex-col items-center pt-3 pb-4 shrink-0">
        {/* Coin logo */}
        <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/40 shadow-[0_0_14px_rgba(245,132,31,0.2)] flex items-center justify-center overflow-hidden mb-3">
          {activeNetwork.logo
            ? <img src={activeNetwork.logo} alt={activeNetwork.name} className="w-10 h-10 object-contain" />
            : <img src="/MetayoshiLogo.png" alt="MetaYoshi" className="w-10 h-10 object-contain object-center scale-[1.05] translate-y-[1px]" />
          }
        </div>

        {/* Balance */}
        <div className="mb-3 w-full px-4">
          <div className="mx-auto max-w-full text-center">
            <p className="text-[clamp(1.3rem,7.1vw,1.95rem)] font-bold leading-tight tracking-tight break-words">
              {displayBalance}
            </p>
            <p className="text-base font-semibold uppercase tracking-wide text-gray-300 mt-0.5">
              {activeNetwork.symbol}
            </p>
          </div>
        </div>

        {/* Quick-action buttons */}
        <div className={`flex justify-center gap-6 w-full px-6 mb-3 ${(caps.ui.showAssetsAction || caps.ui.showSendAction) ? '' : 'gap-0 justify-center'}`}>
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
              onClick={() => setShowSendSheet(true)}
              disabled={sendBlockedBySync}
            />
          )}
          <QuickAction
            icon={<IoSearchOutline className="w-5 h-5" />}
            label="Model"
            onClick={() => navigate(`/wallet/model/${coinModelRouteKey}`)}
          />
        </div>
      </div>

      {/* Tabs — Assets tab hidden for UTXO networks */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

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
          onClick={() => { setShowNetworkSheet(false); setNetworkSearch('') }}
        >
          <div
            className="w-full max-w-[380px] bg-dark-800 rounded-t-3xl border-t border-dark-600 p-5 space-y-3 animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Select Network</h3>
              <button onClick={() => { setShowNetworkSheet(false); setNetworkSearch('') }}>
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

            {/* List */}
            <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
              {visibleNetworks
                .map(net => (
                  <button
                    key={net.id}
                    onClick={() => { void setActiveNetwork(net.id); setShowNetworkSheet(false); setNetworkSearch('') }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                      net.id === activeNetworkId
                        ? 'border-primary bg-primary/10'
                        : 'border-dark-600 bg-dark-700/50 hover:bg-dark-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {net.logo
                        ? <img src={net.logo} alt={net.name} className="w-7 h-7 rounded-full object-cover" />
                        : <div className="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /></div>
                      }
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-bold">{net.name}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-mono">{net.symbol}</span>
                      </div>
                    </div>
                    {net.id === activeNetworkId && (
                      <IoCheckmarkCircle className="w-5 h-5 text-primary shrink-0" />
                    )}
                  </button>
                ))
              }
              {visibleNetworks.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">No networks match "{networkSearch}"</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══ Send bottom sheet ═══════════════════════════════════════════════ */}
      {showSendSheet && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-end"
          onClick={() => setShowSendSheet(false)}
        >
          <div
            className="w-full max-w-[380px] bg-dark-800 rounded-t-3xl border-t border-dark-600 animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Sheet header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-dark-600">
              <h2 className="text-sm font-black uppercase tracking-widest">
                Send {activeNetwork.symbol}
              </h2>
              <button onClick={() => setShowSendSheet(false)}>
                <IoClose className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSend} className="p-6 space-y-4">
              {/* Account + network pill */}
              <div className="p-3 rounded-xl border border-dark-600 bg-dark-700/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500" />
                  <span className="text-xs font-bold">{getAccountDisplayName(activeAccount, activeNetworkId, activeAccount?.name || 'Account')}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-dark-700/50 border border-dark-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  <span className="text-[9px] font-bold text-gray-300 uppercase">{activeNetwork.symbol}</span>
                  <span className="text-[9px] font-bold text-gray-500">·</span>
                  <span className="text-[9px] font-bold text-gray-300">{activeAccount?.balance || '0'}</span>
                </div>
              </div>

              {/* Recipient */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  Recipient Address
                </label>
                <Input
                  placeholder={`Enter ${activeNetwork.name} address`}
                  value={toAddress}
                  onChange={e => setToAddress(e.target.value)}
                  className="bg-dark-700/50 border-dark-600 font-mono text-xs"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  Amount
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.00000001"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="bg-dark-700/50 border-dark-600 pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase">
                    {activeNetwork.symbol}
                  </span>
                </div>

                {/* Percentage quick-fill */}
                <div className="flex gap-2 mt-1">
                  {[0.25, 0.5, 0.75, 1].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setAmount((parseFloat(activeAccount?.balance || '0') * pct).toFixed(8))}
                      className="flex-1 py-1.5 bg-dark-700 rounded-lg text-xs font-bold text-gray-300 hover:bg-dark-600 transition-colors"
                    >
                      {pct * 100}%
                    </button>
                  ))}
                </div>
              </div>

              {donationSupported && (
                <div className="space-y-1.5 p-2 rounded-lg border border-dark-600 bg-dark-700/30">
                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-300">
                      Donation ({donationPercent}%)
                    </span>
                    <input
                      type="checkbox"
                      checked={donationEnabled}
                      disabled={donationRequired || !donationAddress}
                      onChange={(e) => setDonationEnabled(e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                  </label>

                  <div className="text-[9px] leading-relaxed text-gray-500">
                    {donationPolicy?.source === 'bridge' ? 'Source: server policy' : 'Source: app fallback'}
                    {donationRequired ? ' · enforced' : ''}
                    {donationAddress ? ` · ${donationAddress.slice(0, 8)}...${donationAddress.slice(-6)}` : ''}
                  </div>

                  {donationEnabled && (
                    <>
                      {!donationAddress && donationRequired && (
                        <div className="text-[9px] leading-relaxed text-red-300">
                          Donation unavailable: configure bridge donation policy for this coin or set a coin donation env (example: VITE_DOGE_DONATION_ADDRESS).
                        </div>
                      )}
                      {donationAddress && <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDonationMode('add')}
                          className={`py-1 rounded-md text-[9px] font-bold uppercase transition-colors ${
                            donationMode === 'add'
                              ? 'bg-primary text-white'
                              : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                          }`}
                        >
                          Add On Top
                        </button>
                        <button
                          type="button"
                          onClick={() => setDonationMode('deduct')}
                          className={`py-1 rounded-md text-[9px] font-bold uppercase transition-colors ${
                            donationMode === 'deduct'
                              ? 'bg-primary text-white'
                              : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                          }`}
                        >
                          Deduct From Amount
                        </button>
                      </div>}

                      {donationAddress && <div className="text-[9px] leading-relaxed text-gray-500">
                        Donation: <span className="font-bold text-gray-300">{formatCoinAmount(donationAmount)} {activeNetwork.symbol}</span>
                        {' · '}
                        Recipient gets: <span className="font-bold text-gray-300">{formatCoinAmount(recipientAmount)} {activeNetwork.symbol}</span>
                      </div>}
                    </>
                  )}
                </div>
              )}

              {sendError && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-xs font-bold text-red-300 text-center">{sendError}</p>
                </div>
              )}
              {!sendError && sendBlockedBySync && (
                <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs font-bold text-yellow-200 text-center">{syncBlockedReason}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full btn-primary"
                disabled={sendBlockedBySync || !toAddress.trim() || !amount || parseFloat(amount) <= 0}
              >
                Continue
              </Button>
            </form>
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

