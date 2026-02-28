import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useWalletStore } from '../../store/walletStore'
import { IoArrowBackOutline, IoInformationCircleOutline } from 'react-icons/io5'
import { getSendBlockedSyncReason, isSendBlockedBySync } from '../../lib/sendSyncPolicy'
import { resolveNetworkCapabilities } from '../../lib/networkCapabilities'

function formatAmount(raw: number): string {
  return (raw / 1e8).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 8 })
}

function formatAmountInput(raw: number): string {
  const v = raw / 1e8
  return v.toFixed(8).replace(/\.?0+$/, '')
}

const AssetSendPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    accounts,
    activeAccountId,
    networks,
    activeNetworkId,
    networkAssets,
    networkAssetLabels,
    isConnected,
    isSyncing,
    syncPercent,
    lowSyncStreak,
    sendAssetTransfer,
    addActivity,
    fetchNetworkAssets
  } = useWalletStore()

  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0]
  const activeNetwork = networks.find((n) => n.id === activeNetworkId) || networks[0]
  const caps = resolveNetworkCapabilities(activeNetwork)
  const sendBlockedBySync = isSendBlockedBySync(isSyncing, syncPercent, isConnected, lowSyncStreak)
  const syncBlockedReason = getSendBlockedSyncReason(isSyncing, syncPercent, isConnected, lowSyncStreak)
  const rawAssets = networkAssets[activeNetworkId] ?? {}
  const assetLabels = networkAssetLabels[activeNetworkId] ?? {}
  const availableAssetNames = useMemo(
    () => Object.entries(rawAssets).filter(([, raw]) => Number(raw) > 0).map(([name]) => name),
    [rawAssets]
  )
  const requestedAssetId = String((location.state as { assetId?: string } | null)?.assetId || '').trim()
  const initialAsset = (requestedAssetId && availableAssetNames.includes(requestedAssetId))
    ? requestedAssetId
    : (availableAssetNames[0] || '')

  const [selectedAsset, setSelectedAsset] = useState<string>(initialAsset)
  const [toAddress, setToAddress] = useState('')
  const [qty, setQty] = useState('')
  const [sendError, setSendError] = useState('')
  const [sending, setSending] = useState(false)
  const [txid, setTxid] = useState<string | null>(null)

  useEffect(() => {
    if (requestedAssetId && availableAssetNames.includes(requestedAssetId)) {
      setSelectedAsset(requestedAssetId)
      return
    }
    if (!selectedAsset && availableAssetNames.length > 0) {
      setSelectedAsset(availableAssetNames[0])
    }
  }, [requestedAssetId, availableAssetNames, selectedAsset, navigate])

  const selectedRaw = selectedAsset ? (rawAssets[selectedAsset] ?? 0) : 0
  const selectedLabel = selectedAsset ? (assetLabels[selectedAsset] || selectedAsset) : ''
  const canSubmitAssetSend = caps.features.assetSend

  const handleMax = () => {
    if (!selectedAsset) return
    setQty(formatAmountInput(rawAssets[selectedAsset] ?? 0))
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendError('')
    if (!selectedAsset) {
      setSendError('Asset not selected')
      return
    }
    if (!canSubmitAssetSend) {
      setSendError(`${activeNetwork.name} does not support token asset sends yet.`)
      return
    }
    if (sendBlockedBySync) {
      setSendError(syncBlockedReason)
      return
    }
    if (!toAddress.trim()) {
      setSendError('Recipient address is required')
      return
    }
    if (!qty || parseFloat(qty) <= 0) {
      setSendError('Quantity must be greater than 0')
      return
    }
    const avail = (rawAssets[selectedAsset] ?? 0) / 1e8
    if (parseFloat(qty) > avail) {
      setSendError('Insufficient asset balance')
      return
    }

    setSending(true)
    try {
      const result = await sendAssetTransfer({ assetId: selectedAsset, qty, toAddress: toAddress.trim() })
      const fromAddress = activeAccount?.networkAddresses?.[activeNetworkId]
        || (activeNetwork.coinType === 'EVM' ? activeAccount?.addresses?.EVM : '')
        || ''
      addActivity({
        id: result.txid,
        type: 'sent',
        asset: selectedAsset,
        amount: qty,
        from: fromAddress,
        to: toAddress.trim(),
        status: 'confirmed',
        timestamp: Date.now(),
        networkId: activeNetworkId
      })
      setTxid(result.txid)
      void fetchNetworkAssets()
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  if (availableAssetNames.length === 0) {
    return (
      <div className="flex flex-col h-full bg-dark-800">
        <header className="p-4 border-b border-dark-600 flex items-center gap-3">
          <button onClick={() => navigate('/assets')} className="text-gray-400 hover:text-white transition-colors">
            <IoArrowBackOutline className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-black uppercase tracking-widest text-gray-200">Send Asset</h1>
        </header>
        <div className="flex-1 flex items-center justify-center px-6 text-center text-gray-400 text-sm">
          No spendable assets available on this address.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 border-b border-dark-600 flex items-center gap-3">
        <button onClick={() => navigate('/assets')} className="text-gray-400 hover:text-white transition-colors">
          <IoArrowBackOutline className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-gray-200">Send Asset</h1>
      </header>

      <form onSubmit={handleSend} className="flex-1 flex flex-col p-6 space-y-5 overflow-y-auto custom-scrollbar">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Asset</label>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(String(e.target.value || '').trim())}
            className="w-full h-10 rounded-xl border border-dark-600 bg-dark-700/50 px-3 text-sm text-white"
          >
            {availableAssetNames.map((assetId) => (
              <option key={assetId} value={assetId}>
                {assetLabels[assetId] || assetId}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-gray-500">
            Available: {formatAmount(selectedRaw)} {selectedLabel}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Recipient Address</label>
          <Input
            placeholder={`Enter ${activeNetwork.name} address`}
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            className="bg-dark-700/50 border-dark-600 font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Quantity</label>
          <div className="relative">
            <Input
              type="number"
              step="0.00000001"
              placeholder="0.00"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="bg-dark-700/50 border-dark-600 pr-20"
            />
            <button
              type="button"
              onClick={handleMax}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-bold rounded bg-primary/20 text-primary border border-primary/30"
            >
              MAX
            </button>
          </div>
        </div>

        <div className="flex gap-2.5 p-3 bg-dark-700/20 rounded-xl border border-dark-600/60">
          <IoInformationCircleOutline className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-600 leading-relaxed">
            Asset transfer fee is paid in native {activeNetwork.symbol}. Keep some native balance for fees.
          </p>
        </div>

        {txid && (
          <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-xl">
            <p className="text-xs font-bold text-green-300 text-center">Asset sent successfully</p>
            <p className="text-[10px] font-mono text-green-200 text-center break-all mt-1">{txid}</p>
          </div>
        )}

        {sendError && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl">
            <p className="text-xs font-bold text-red-300 text-center">{sendError}</p>
          </div>
        )}

        {!sendError && sendBlockedBySync && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
            <p className="text-xs font-bold text-yellow-200 text-center">{syncBlockedReason}</p>
          </div>
        )}

        <div className="mt-auto pt-4">
          <Button
            type="submit"
            className="w-full btn-primary"
            disabled={!canSubmitAssetSend || sendBlockedBySync || sending || !toAddress.trim() || !qty || parseFloat(qty) <= 0}
          >
            {sending ? 'Sending...' : `Send ${selectedLabel || 'Asset'}`}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default AssetSendPage
