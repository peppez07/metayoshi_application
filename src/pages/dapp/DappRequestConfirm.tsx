import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { PasswordGate } from '../../components/PasswordGate'
import {
  DAPP_PENDING_REQUEST_STORAGE_KEY,
  parseDappPendingRequest,
  type DappPendingRequest
} from '../../lib/dappPermissions'
import { useWalletStore } from '../../store/walletStore'
import { getSendBlockedSyncReason, isSendBlockedBySync } from '../../lib/sendSyncPolicy'

function canUseChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
}

const DappRequestConfirm: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    isLocked,
    networks,
    activeNetworkId,
    activeAccountId,
    setActiveNetwork,
    setActiveAccount,
    sendEvmTransaction,
    sendXrpTransaction,
    sendCardanoTransaction,
    sendMoneroTransaction,
    sendSolanaTransaction,
    sendStellarTransaction,
    sendTronTransaction,
    sendUtxoTransaction,
    sendRtmAsset,
    refreshActiveBalance,
    addActivity,
    isConnected,
    isSyncing,
    syncPercent,
    lowSyncStreak
  } = useWalletStore()
  const [pendingRequest, setPendingRequest] = useState<DappPendingRequest | null>(null)
  const [loadingRequest, setLoadingRequest] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const requestedId = useMemo(
    () => new URLSearchParams(location.search).get('id') || '',
    [location.search]
  )

  const activeNetwork = useMemo(
    () => networks.find((n) => n.id === activeNetworkId) || networks[0],
    [networks, activeNetworkId]
  )
  const requestNetwork = useMemo(
    () => networks.find((n) => n.id === pendingRequest?.networkId) || activeNetwork,
    [networks, pendingRequest, activeNetwork]
  )
  const requestIsAssetSend = pendingRequest?.method === 'wallet_sendAsset'
  const requestTo = requestIsAssetSend
    ? String((pendingRequest?.request as any)?.toAddress || '')
    : String((pendingRequest?.request as any)?.to || '')
  const requestAmount = requestIsAssetSend
    ? String((pendingRequest?.request as any)?.qty || '')
    : String((pendingRequest?.request as any)?.amount || '')
  const requestAssetId = requestIsAssetSend
    ? String((pendingRequest?.request as any)?.assetId || '')
    : ''
  const sendBlockedBySync = isSendBlockedBySync(isSyncing, syncPercent, isConnected, lowSyncStreak)
  const syncBlockedReason = getSendBlockedSyncReason(isSyncing, syncPercent, isConnected, lowSyncStreak)

  useEffect(() => {
    if (!canUseChromeStorage()) {
      setLoadingRequest(false)
      return
    }

    let mounted = true

    const applyPendingValue = (rawValue: unknown): void => {
      const parsed = parseDappPendingRequest(rawValue)
      if (!mounted) return
      if (!parsed || (requestedId && parsed.id !== requestedId)) {
        setPendingRequest(null)
        setLoadingRequest(false)
        return
      }
      if (parsed.status !== 'pending' && parsed.status !== 'approved') {
        setPendingRequest(null)
        setLoadingRequest(false)
        return
      }
      setPendingRequest(parsed)
      setLoadingRequest(false)
    }

    void chrome.storage.local
      .get(DAPP_PENDING_REQUEST_STORAGE_KEY)
      .then((result) => {
        applyPendingValue(result[DAPP_PENDING_REQUEST_STORAGE_KEY])
      })
      .catch(() => {
        if (!mounted) return
        setPendingRequest(null)
        setLoadingRequest(false)
      })

    const onStorageChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ): void => {
      if (areaName !== 'local' || !changes[DAPP_PENDING_REQUEST_STORAGE_KEY]) return
      applyPendingValue(changes[DAPP_PENDING_REQUEST_STORAGE_KEY].newValue)
    }

    chrome.storage.onChanged.addListener(onStorageChanged)
    return () => {
      mounted = false
      chrome.storage.onChanged.removeListener(onStorageChanged)
    }
  }, [requestedId])

  const rejectRequest = async (): Promise<void> => {
    if (canUseChromeStorage() && pendingRequest) {
      await chrome.storage.local.set({
        [DAPP_PENDING_REQUEST_STORAGE_KEY]: {
          ...pendingRequest,
          status: 'rejected',
          error: { code: 4001, message: 'User rejected the request' },
          updatedAt: Date.now()
        }
      })
    }
    navigate('/wallet/assets')
    window.close()
  }

  const approveRequest = async (): Promise<void> => {
    if (!pendingRequest || isSubmitting) return
    setSubmitError('')
    if (sendBlockedBySync) {
      setSubmitError(syncBlockedReason)
      return
    }
    setIsSubmitting(true)

    try {
      if (!canUseChromeStorage()) {
        throw new Error('Extension storage is unavailable')
      }

      await chrome.storage.local.set({
        [DAPP_PENDING_REQUEST_STORAGE_KEY]: {
          ...pendingRequest,
          status: 'approved',
          updatedAt: Date.now()
        }
      })

      if (activeNetworkId !== pendingRequest.networkId) {
        await setActiveNetwork(pendingRequest.networkId)
      }
      if (activeAccountId !== pendingRequest.accountId) {
        setActiveAccount(pendingRequest.accountId)
      }

      const tx = requestIsAssetSend
        ? await sendRtmAsset({
            assetId: requestAssetId,
            qty: requestAmount,
            toAddress: requestTo
          })
        : requestNetwork.coinType === 'EVM'
        ? await sendEvmTransaction({
            to: requestTo,
            amount: requestAmount
          })
        : requestNetwork.coinType === 'XRP'
        ? await sendXrpTransaction({
            to: requestTo,
            amount: requestAmount
          })
        : requestNetwork.id === 'ada'
        ? await sendCardanoTransaction({
            to: requestTo,
            amount: requestAmount
          })
        : requestNetwork.id === 'xmr'
        ? await sendMoneroTransaction({
            to: requestTo,
            amount: requestAmount
          })
        : requestNetwork.id === 'sol'
        ? await sendSolanaTransaction({
            to: requestTo,
            amount: requestAmount
          })
        : requestNetwork.id === 'xlm'
        ? await sendStellarTransaction({
            to: requestTo,
            amount: requestAmount
          })
        : requestNetwork.id === 'tron'
        ? await sendTronTransaction({
            to: requestTo,
            amount: requestAmount
          })
        : await sendUtxoTransaction({
            to: requestTo,
            amount: requestAmount
          })
      const txHash = String((tx as any)?.hash || (tx as any)?.txid || '').trim()
      if (!txHash) throw new Error('Transaction hash is missing from wallet response')

      const latestState = useWalletStore.getState()
      const networkForActivity = latestState.networks.find((n) => n.id === pendingRequest.networkId) || latestState.networks[0]
      const accountForActivity = latestState.accounts.find((a) => a.id === pendingRequest.accountId) || latestState.accounts[0]
      const senderAddress = requestNetwork.coinType === 'EVM'
        ? (accountForActivity?.addresses?.EVM || '')
        : accountForActivity?.networkAddresses?.[pendingRequest.networkId]
        || (requestNetwork.coinType === 'XRP' ? accountForActivity?.addresses?.XRP : accountForActivity?.addresses?.UTXO)
        || ''

      if (networkForActivity) {
        addActivity({
          id: txHash,
          type: 'sent',
          asset: requestIsAssetSend ? requestAssetId : networkForActivity.symbol,
          amount: requestAmount,
          from: senderAddress,
          to: requestTo,
          status: 'confirmed',
          timestamp: Date.now(),
          networkId: networkForActivity.id
        })
      }
      await refreshActiveBalance()

      await chrome.storage.local.set({
        [DAPP_PENDING_REQUEST_STORAGE_KEY]: {
          ...pendingRequest,
          status: 'executed',
          result: { hash: txHash, txid: txHash },
          updatedAt: Date.now()
        }
      })

      navigate('/wallet/assets')
      window.close()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || 'Transaction failed')
      setSubmitError(message)

      if (canUseChromeStorage() && pendingRequest) {
        await chrome.storage.local.set({
          [DAPP_PENDING_REQUEST_STORAGE_KEY]: {
            ...pendingRequest,
            status: 'failed',
            error: { code: -32603, message },
            updatedAt: Date.now()
          }
        })
      }
      navigate('/wallet/assets')
      window.close()
    } finally {
      setIsSubmitting(false)
    }
  }

  const content = (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 flex items-center justify-between border-b border-dark-600">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dapp Transaction Request</span>
      </header>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
        {loadingRequest ? (
          <div className="text-center text-xs text-gray-400">Loading request...</div>
        ) : null}

        {!loadingRequest && !pendingRequest ? (
          <div className="text-center text-sm text-gray-400">No pending transaction request.</div>
        ) : null}

        {pendingRequest ? (
          <>
            <div className="space-y-2 text-center">
              <h2 className="text-lg font-bold">Approve transaction</h2>
              <p className="text-xs text-gray-400 break-all">{pendingRequest.origin}</p>
            </div>

            <div className="p-4 rounded-xl border border-dark-600 bg-dark-700/50 space-y-3">
              <Row label="Network" value={requestNetwork?.name || pendingRequest.networkId} />
              <Row label="Runtime Model" value={String(requestNetwork?.runtimeModelId || requestNetwork?.id || 'unknown')} mono />
              <Row label="Type" value={requestIsAssetSend ? 'Asset Transfer' : 'Native Coin Transfer'} />
              <Row label="To" value={requestTo} mono />
              {requestIsAssetSend ? <Row label="Asset" value={requestAssetId} mono /> : null}
              <Row label="Amount" value={`${requestAmount} ${requestIsAssetSend ? '' : (requestNetwork?.symbol || '')}`.trim()} />
            </div>

            {submitError ? (
              <p className="text-xs text-red-400 break-words">{submitError}</p>
            ) : null}
            {!submitError && sendBlockedBySync ? (
              <p className="text-xs text-yellow-300 break-words">{syncBlockedReason}</p>
            ) : null}
          </>
        ) : null}
      </div>

      <footer className="p-4 border-t border-dark-600 flex gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => { void rejectRequest() }}
          disabled={isSubmitting}
        >
          Reject
        </Button>
        <Button
          className="flex-1 btn-primary"
          onClick={() => { void approveRequest() }}
          isLoading={isSubmitting}
          disabled={!pendingRequest || sendBlockedBySync}
        >
          Approve
        </Button>
      </footer>
    </div>
  )

  if (isLocked) {
    return (
      <PasswordGate
        title="Unlock to approve transaction"
        description="Enter your wallet password to review and approve this dApp request."
      >
        {content}
      </PasswordGate>
    )
  }

  return content
}

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono = false }) => (
  <div className="flex flex-col gap-1">
    <p className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</p>
    <p className={mono ? 'text-xs text-gray-200 font-mono break-all' : 'text-sm text-gray-200'}>{value}</p>
  </div>
)

export default DappRequestConfirm
