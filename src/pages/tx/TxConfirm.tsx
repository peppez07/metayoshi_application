import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Tabs } from '../../components/Tabs'
import { useWalletStore } from '../../store/walletStore'
import { IoArrowBack, IoArrowForward, IoCheckmarkCircle, IoHomeOutline, IoInformationCircle } from 'react-icons/io5'
import { resolveNetworkCapabilities } from '../../lib/networkCapabilities'
import { getSendBlockedSyncReason, isSendBlockedBySync } from '../../lib/sendSyncPolicy'
import { getAccountDisplayName } from '../../lib/accountName'

interface TxLayoutProps {
  title: string
  error?: string
  isRejectMode?: boolean
}

interface TxState {
  requestType?: 'native' | 'asset'
  assetId?: string
  assetLabel?: string
  to?: string
  amount?: string
  from?: string
  origin?: string
  enteredAmount?: string
  donationEnabled?: boolean
  donationPercent?: number
  donationMode?: 'add' | 'deduct'
  donationAmount?: string
  donationAddress?: string
  donationRequired?: boolean
  totalBeforeNetworkFee?: string
}

function formatCoinAmount(v: number): string {
  return v.toFixed(8).replace(/\.?0+$/, '')
}

function estimateTransferFee(network: { coinType: string; feePerByte?: number }): number {
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

const TxLayout: React.FC<TxLayoutProps> = ({ title, error, isRejectMode }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    accounts,
    activeAccountId,
    networks,
    activeNetworkId,
    addActivity,
    sendEvmTransaction,
    sendXrpTransaction,
    sendCardanoTransaction,
    sendMoneroTransaction,
    sendSolanaTransaction,
    sendStellarTransaction,
    sendTronTransaction,
    sendUtxoTransaction,
    sendAssetTransfer,
    refreshActiveBalance,
    isConnected,
    isSyncing,
    syncPercent,
    lowSyncStreak
  } = useWalletStore()
  const [activeTab, setActiveTab] = useState('details')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const txState = (location.state as TxState | null) ?? {}
  const isAssetTransfer = txState.requestType === 'asset' || Boolean(String(txState.assetId || '').trim())
  const assetId = String(txState.assetId || '').trim()
  const assetLabel = String(txState.assetLabel || assetId || '').trim()
  const toAddress = txState.to?.trim() ?? ''
  const amount = txState.amount?.trim() ?? ''
  const fromAddress = txState.from?.trim() ?? ''
  const requestOrigin = String(txState.origin ?? '').trim() || 'metayoshi provider'
  const hasTxState = Boolean(toAddress && amount)
  const numericAmount = Number(amount)
  const safeAmount = Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : 0
  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0]
  const activeNetwork = networks.find(n => n.id === activeNetworkId) || networks[0]
  const activeAccountName = getAccountDisplayName(activeAccount, activeNetworkId, 'Account 1')
  const caps = resolveNetworkCapabilities(activeNetwork)
  const sendBlockedBySync = isSendBlockedBySync(isSyncing, syncPercent, isConnected, lowSyncStreak)
  const syncBlockedReason = getSendBlockedSyncReason(isSyncing, syncPercent, isConnected, lowSyncStreak)

  const enteredAmountNumRaw = Number(txState.enteredAmount ?? amount)
  const enteredAmount = Number.isFinite(enteredAmountNumRaw) && enteredAmountNumRaw > 0 ? enteredAmountNumRaw : safeAmount
  const donationEnabled = txState.donationEnabled === true
  const donationPercentRaw = Number(txState.donationPercent ?? 0)
  const donationPercent = Number.isFinite(donationPercentRaw) && donationPercentRaw > 0 ? donationPercentRaw : 0
  const donationMode = txState.donationMode === 'deduct' ? 'deduct' : 'add'
  const donationAmountRaw = Number(txState.donationAmount ?? (donationEnabled ? (enteredAmount * donationPercent) / 100 : 0))
  const donationAmount = Number.isFinite(donationAmountRaw) && donationAmountRaw > 0 ? donationAmountRaw : 0
  const donationAddress = String(txState.donationAddress ?? '').trim()
  const donationRequired = txState.donationRequired === true
  const spendBeforeNetworkFeeRaw = Number(txState.totalBeforeNetworkFee ?? (donationEnabled && donationMode === 'add' ? safeAmount + donationAmount : enteredAmount))
  const spendBeforeNetworkFee = Number.isFinite(spendBeforeNetworkFeeRaw) && spendBeforeNetworkFeeRaw > 0 ? spendBeforeNetworkFeeRaw : safeAmount
  const estimatedNetworkFee = estimateTransferFee(activeNetwork)
  const estimatedTotalCost = spendBeforeNetworkFee + estimatedNetworkFee

  const TABS = [
    { id: 'details', label: 'DETAILS' },
    { id: 'data', label: 'DATA' },
    { id: 'hex', label: 'HEX' }
  ]

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/wallet/assets')
  }

  const handleHome = () => {
    navigate('/wallet/assets')
  }

  const handleConfirm = async () => {
    if (isRejectMode) return
    setSubmitError('')
    if (!hasTxState) {
      setSubmitError('No pending transaction to confirm')
      return
    }
    if (!toAddress || safeAmount <= 0) {
      setSubmitError('Transaction data is invalid')
      return
    }
    if (isAssetTransfer && !caps.features.assetSend) {
      setSubmitError(`${activeNetwork.name} does not support asset transfers in this wallet`)
      return
    }
    if (!isAssetTransfer && !caps.features.nativeSend) {
      setSubmitError(`${activeNetwork.name} does not support native coin transfers in this wallet`)
      return
    }
    if (sendBlockedBySync) {
      setSubmitError(syncBlockedReason)
      return
    }
    if (activeNetwork.coinType === 'UTXO' && donationEnabled && donationRequired && donationAmount > 0 && !donationAddress) {
      setSubmitError('Donation address missing from server policy/config')
      return
    }
    setIsSubmitting(true)

    try {
      let txHash = ''
      if (isAssetTransfer) {
        if (!assetId) throw new Error('Asset id missing from transaction request')
        const sent = await sendAssetTransfer({
          assetId,
          qty: amount,
          toAddress: toAddress
        })
        txHash = String(sent.txid || '').trim()
      } else if (activeNetwork.coinType === 'EVM') {
        const res = await sendEvmTransaction({ to: toAddress, amount })
        txHash = String(res.hash || '').trim()
      } else if (activeNetwork.coinType === 'XRP') {
        const res = await sendXrpTransaction({ to: toAddress, amount })
        txHash = String(res.hash || '').trim()
      } else if (activeNetwork.id === 'ada') {
        const res = await sendCardanoTransaction({ to: toAddress, amount })
        txHash = String(res.hash || '').trim()
      } else if (activeNetwork.id === 'xmr') {
        const res = await sendMoneroTransaction({ to: toAddress, amount })
        txHash = String(res.hash || '').trim()
      } else if (activeNetwork.id === 'sol') {
        const res = await sendSolanaTransaction({ to: toAddress, amount })
        txHash = String(res.hash || '').trim()
      } else if (activeNetwork.id === 'xlm') {
        const res = await sendStellarTransaction({ to: toAddress, amount })
        txHash = String(res.hash || '').trim()
      } else if (activeNetwork.id === 'tron') {
        const res = await sendTronTransaction({ to: toAddress, amount })
        txHash = String(res.hash || '').trim()
      } else if (activeNetwork.coinType === 'UTXO') {
        const res = await sendUtxoTransaction({
          to: toAddress,
          amount,
          donation: donationEnabled
            ? {
                address: donationAddress,
                amount: formatCoinAmount(donationAmount),
                required: donationRequired
              }
            : undefined
        })
        txHash = String(res.hash || '').trim()
      } else {
        throw new Error(`Unsupported coin type: ${activeNetwork.coinType}`)
      }
      if (!txHash) throw new Error('Transaction sent but hash is missing')
      
      addActivity({
        id: txHash,
        type: 'sent',
        asset: isAssetTransfer ? (assetLabel || assetId || 'ASSET') : activeNetwork.symbol,
        amount: amount,
        from: fromAddress || '',
        to: toAddress,
        status: 'confirmed',
        timestamp: Date.now(),
        networkId: activeNetwork.id
      })
      void refreshActiveBalance({ fast: true, skipZeroBalanceRecheck: true }).catch((err) => {
        console.warn('Post-send fast balance refresh failed:', err)
      })
      navigate('/connecting')
    } catch (e: any) {
      setSubmitError(String(e?.message ?? 'Transaction failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = () => {
    if (!hasTxState) {
      navigate('/wallet/activity')
      return
    }
    addActivity({
      id: Math.random().toString(36).substr(2, 9),
      type: 'sent',
      asset: isAssetTransfer ? (assetLabel || assetId || 'ASSET') : activeNetwork.symbol,
      amount: amount,
      from: fromAddress || '',
      to: toAddress,
      status: 'rejected',
      timestamp: Date.now(),
      networkId: activeNetwork.id
    })
    navigate('/wallet/activity')
  }

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="px-4 py-2 bg-dark-900 border-b border-dark-600 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dark-600 bg-dark-700/40 hover:bg-dark-700 text-gray-200"
          title="Go back"
        >
          <IoArrowBack className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Back</span>
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</span>
        <button
          type="button"
          onClick={handleHome}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary"
          title="Go to home"
        >
          <IoHomeOutline className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Home</span>
        </button>
      </header>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
        <div className="p-4 rounded-xl border border-dark-600 bg-dark-700/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-yellow-500" />
              <span className="text-xs font-bold">{activeAccountName}</span>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-dark-700/50 border border-dark-600 flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
               <span className="text-[9px] font-bold text-gray-300 uppercase">{activeNetwork.name}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
             <span className="text-[11px] font-mono text-gray-400">
               {fromAddress && fromAddress.length > 12
                 ? `${fromAddress.slice(0, 6)}...${fromAddress.slice(-6)}`
                 : activeAccountName}
             </span>
             <IoArrowForward className="text-gray-600 w-3 h-3" />
             <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-purple-500" />
                <span className="text-[11px] font-mono text-gray-200">
                  {toAddress.length > 12 ? `${toAddress.slice(0, 6)}...${toAddress.slice(-6)}` : (toAddress || '—')}
                </span>
             </div>
          </div>

          <div className="divider" />

          <div className="space-y-1">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Origin</p>
            <p className="text-[11px] font-medium text-primary break-all">{requestOrigin}</p>
          </div>

          <div className="p-3 bg-dark-800 rounded-xl border border-dark-600 space-y-1">
            <p className="text-[11px] font-mono text-blue-400 font-bold break-all">
              {toAddress || 'No recipient provided'}
            </p>
            <p className="text-[11px] font-mono text-gray-300">
              {safeAmount > 0 ? `${safeAmount} ${isAssetTransfer ? (assetLabel || 'ASSET') : activeNetwork.symbol}` : 'No amount provided'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-yellow-500" />
          </div>
        </div>

        <Tabs 
          tabs={TABS} 
          activeTab={activeTab} 
          onChange={setActiveTab} 
          className="px-2" 
        />

        <div className="p-2 space-y-4">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                 <div className="space-y-0.5">
                    <p className="text-[11px] font-bold">Network fee estimate</p>
                    <p className="text-[10px] text-gray-500">Based on current wallet defaults</p>
                 </div>
                 <div className="text-right">
                    <p className="text-xs font-bold">{formatCoinAmount(estimatedNetworkFee)}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{activeNetwork.symbol}</p>
                    <p className="text-[9px] text-gray-500">Est. fee only</p>
                 </div>
              </div>

              {donationEnabled && !isAssetTransfer && (
                <>
                  <div className="divider" />
                  <div className="flex justify-between items-start">
                     <div className="space-y-0.5">
                        <p className="text-[11px] font-bold">Donation</p>
                        <p className="text-[10px] text-gray-500">
                          {donationPercent}% ({donationMode === 'add' ? 'added on top' : 'deducted from entered amount'}){donationRequired ? ' · server-enforced' : ''}
                        </p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs font-bold">{formatCoinAmount(donationAmount)}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{activeNetwork.symbol}</p>
                        {donationAddress && (
                          <p className="text-[9px] text-gray-500">
                            To: <span className="font-bold">{donationAddress.slice(0, 8)}...{donationAddress.slice(-6)}</span>
                          </p>
                        )}
                     </div>
                  </div>
                </>
              )}

              <div className="divider" />

              <div className="flex justify-between items-start">
                 <div className="space-y-0.5">
                    <p className="text-[12px] font-bold">{isAssetTransfer ? 'Asset amount' : 'Recipient gets'}</p>
                    <p className="text-[10px] text-gray-500">{isAssetTransfer ? 'Asset transfer quantity' : 'Final transfer amount'}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-sm font-bold">{formatCoinAmount(safeAmount)}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{isAssetTransfer ? (assetLabel || 'ASSET') : activeNetwork.symbol}</p>
                    {donationEnabled && donationMode === 'deduct' && !isAssetTransfer && (
                      <p className="text-[9px] text-gray-500">Entered: <span className="font-bold">{formatCoinAmount(enteredAmount)} {activeNetwork.symbol}</span></p>
                    )}
                  </div>
              </div>

              {!isAssetTransfer && (
                <>
                  <div className="divider" />

                  <div className="flex justify-between items-start">
                     <div className="space-y-0.5">
                        <p className="text-[12px] font-bold">Estimated total cost</p>
                        <p className="text-[10px] text-gray-500">Spend + network fee</p>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-bold">{formatCoinAmount(estimatedTotalCost)}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{activeNetwork.symbol}</p>
                        <p className="text-[9px] text-gray-500">
                          Network fee: <span className="font-bold">{formatCoinAmount(estimatedNetworkFee)} {activeNetwork.symbol}</span>
                        </p>
                        <p className="text-[9px] text-gray-500">
                          Additional donation: <span className="font-bold">{formatCoinAmount(donationEnabled ? donationAmount : 0)} {activeNetwork.symbol}</span>
                        </p>
                     </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'data' && (
            <div className="bg-dark-900 p-4 rounded-xl border border-dark-600 font-mono text-[10px] text-gray-500">
              <p>{"{"}</p>
              <p className="ml-4">"method": "{isAssetTransfer ? 'send_asset' : 'send'}",</p>
              <p className="ml-4">"params": [{isAssetTransfer ? `"${assetId}", ` : ''}"{toAddress || 'N/A'}", "{amount || '0'}"]</p>
              {donationEnabled && !isAssetTransfer && (
                <>
                  <p className="ml-4">"donation": {"{"}</p>
                  <p className="ml-8">"enabled": true,</p>
                  <p className="ml-8">"percent": {donationPercent},</p>
                  <p className="ml-8">"mode": "{donationMode}",</p>
                  <p className="ml-8">"amount": "{formatCoinAmount(donationAmount)}",</p>
                  <p className="ml-8">"address": "{donationAddress || 'N/A'}",</p>
                  <p className="ml-8">"required": {donationRequired ? 'true' : 'false'}</p>
                  <p className="ml-4">{"}"}</p>
                </>
              )}
              <p>{"}"}</p>
            </div>
          )}

          {activeTab === 'hex' && (
            <div className="bg-dark-900 p-4 rounded-xl border border-dark-600 font-mono text-[10px] text-gray-500 break-all leading-tight">
              0x095ea7b3000000000000000000000000010e...202e0000000000000000000000000000000000000000000000000000000001438a00
            </div>
          )}
        </div>

        {error && (
          <div className="mx-2 p-3 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-2">
            <IoInformationCircle className="text-red-400 w-4 h-4 shrink-0" />
            <span className="text-xs font-bold text-red-300">{error}</span>
          </div>
        )}

        {submitError && (
          <div className="mx-2 p-3 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-2">
            <IoInformationCircle className="text-red-400 w-4 h-4 shrink-0" />
            <span className="text-xs font-bold text-red-300">{submitError}</span>
          </div>
        )}

        {!submitError && sendBlockedBySync && (
          <div className="mx-2 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-xl flex items-center gap-2">
            <IoInformationCircle className="text-yellow-300 w-4 h-4 shrink-0" />
            <span className="text-xs font-bold text-yellow-200">{syncBlockedReason}</span>
          </div>
        )}
      </div>

      <footer className="p-4 border-t border-dark-600 flex gap-4 mt-auto">
        <Button 
          variant="outline" 
          className="flex-1 btn-outline"
          onClick={handleReject}
        >
          Reject
        </Button>
        <Button
          className="flex-1 btn-primary"
          onClick={handleConfirm}
          disabled={isRejectMode || isSubmitting || !(isAssetTransfer ? caps.features.assetSend : caps.features.nativeSend) || !hasTxState || sendBlockedBySync}
          isLoading={isSubmitting}
        >
          Confirm
        </Button>
      </footer>
    </div>
  )
}

export const TxConfirm: React.FC = () => <TxLayout title="CONFIRM TRANSFER" />
export const TxReject: React.FC = () => <TxLayout title="REJECT" error="Insufficient funds" isRejectMode />

export default TxConfirm
