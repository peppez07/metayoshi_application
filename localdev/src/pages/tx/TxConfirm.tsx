import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../../components/Button'
import { PasswordGate } from '../../components/PasswordGate'
import { Tabs } from '../../components/Tabs'
import { formatFiatValue, useWalletStore } from '../../store/walletStore'
import { IoArrowBack, IoArrowForward, IoCheckmarkCircle, IoHomeOutline, IoInformationCircle } from 'react-icons/io5'
import { resolveNetworkCapabilities } from '../../lib/networkCapabilities'
import { getSendBlockedSyncReason, isSendBlockedBySync } from '../../lib/sendSyncPolicy'
import { getAccountDisplayName } from '../../lib/accountName'
import { isCosmosLikeModelId, resolveRuntimeModelId } from '../../lib/runtimeModel'
import { estimateNetworkFeeUi } from '../../lib/estimateNetworkFeeUi'
import { estimateTransactionFeePreview, type TransactionFeePreviewResult } from '../../lib/transactionFeePreview'
import { resolveFeePreviewRecipient } from '../../lib/feePreviewRecipient'
import { buildNativeActivityAssetId } from '../../lib/activityIdentity'
import {
  DAPP_PENDING_REQUEST_STORAGE_KEY,
  parseDappPendingRequest,
  type DappPendingRequest,
  type DappSendEvmTransactionPayload
} from '../../lib/dappPermissions'

const EMPTY_LOGO_MAP: Record<string, string> = {}

interface TxLayoutProps {
  title: string
  error?: string
  isRejectMode?: boolean
}

interface TxState {
  requestType?: 'native' | 'asset'
  assetId?: string
  feePreviewAssetId?: string
  assetLabel?: string
  to?: string
  amount?: string
  memo?: string
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
  dataHex?: string
  returnTo?: string
  returnLabel?: string
}

interface TxResultState {
  txid: string
  networkId: string
  accountId?: string
  asset: string
  assetId?: string
  amount: string
  from?: string
  to?: string
  status?: string
  origin?: string
  requestMethod?: string
  returnTo?: string
  returnLabel?: string
}

function canUseChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
}

function isDappEvmTransactionRequest(request: DappPendingRequest['request'] | null | undefined): request is DappSendEvmTransactionPayload {
  return Boolean(request && typeof request === 'object' && 'data' in request)
}

function formatCoinAmount(v: number): string {
  return v.toFixed(8).replace(/\.?0+$/, '')
}

function parseCoinAmount(value: unknown): number {
  const parsed = Number(String(value ?? '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

const TxLayout: React.FC<TxLayoutProps> = ({ title, error, isRejectMode }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    accounts,
    activeAccountId,
    networks,
    activeNetworkId,
    setActiveAccount,
    setActiveNetwork,
    addActivity,
    trackActivityTransactionStatus,
    sendEvmTransaction,
    getNetworkModelPreferences,
    sendXrpTransaction,
    sendCardanoTransaction,
    sendMoneroTransaction,
    sendSolanaTransaction,
    sendSuiTransaction,
    sendStellarTransaction,
    sendTronTransaction,
    sendUtxoTransaction,
    sendAssetTransfer,
    refreshActiveBalance,
    networkAssetLogos,
    accountNetworkAssets,
    accountNetworkFiatNative,
    accountNetworkFiatAssets,
    isConnected,
    isLocked,
    isSyncing,
    syncPercent,
    lowSyncStreak
  } = useWalletStore()
  const [activeTab, setActiveTab] = useState('details')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [pendingDappRequest, setPendingDappRequest] = useState<DappPendingRequest | null>(null)
  const [lastKnownDappRequest, setLastKnownDappRequest] = useState<DappPendingRequest | null>(null)
  const [loadingDappRequest, setLoadingDappRequest] = useState(false)

  const txState = (location.state as TxState | null) ?? {}
  const dappRequestId = useMemo(() => new URLSearchParams(location.search).get('id') || '', [location.search])
  const isDappTxRoute = useMemo(() => new URLSearchParams(location.search).get('dappRequest') === '1', [location.search])

  useEffect(() => {
    if (!isDappTxRoute || !canUseChromeStorage()) {
      setPendingDappRequest(null)
      setLoadingDappRequest(false)
      return
    }

    let mounted = true
    setLoadingDappRequest(true)

    const applyPendingValue = (rawValue: unknown): void => {
      const parsed = parseDappPendingRequest(rawValue)
      if (!mounted) return
      if (!parsed || (dappRequestId && parsed.id !== dappRequestId)) {
        setPendingDappRequest(null)
        setLoadingDappRequest(false)
        return
      }
      if (
        (parsed.method !== 'wallet_sendTransaction' && parsed.method !== 'wallet_sendAsset')
        || (parsed.status !== 'pending' && parsed.status !== 'approved')
      ) {
        setPendingDappRequest(null)
        setLoadingDappRequest(false)
        return
      }
      setPendingDappRequest(parsed)
      setLastKnownDappRequest(parsed)
      setLoadingDappRequest(false)
    }

    void chrome.storage.local
      .get(DAPP_PENDING_REQUEST_STORAGE_KEY)
      .then((result) => {
        applyPendingValue(result[DAPP_PENDING_REQUEST_STORAGE_KEY])
      })
      .catch(() => {
        if (!mounted) return
        setPendingDappRequest(null)
        setLoadingDappRequest(false)
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
  }, [dappRequestId, isDappTxRoute])

  const currentDappRequest = pendingDappRequest || lastKnownDappRequest
  const dappRequestPayload = currentDappRequest?.request as Record<string, unknown> | undefined
  const dappIsAssetTransfer = currentDappRequest?.method === 'wallet_sendAsset'
  const dappIsEvmTx = !dappIsAssetTransfer && isDappEvmTransactionRequest(currentDappRequest?.request)
  const dappAssetId = dappIsAssetTransfer ? String(dappRequestPayload?.assetId || '').trim() : ''
  const dappToAddress = dappIsAssetTransfer
    ? String(dappRequestPayload?.toAddress || '').trim()
    : String(dappRequestPayload?.to || '').trim()
  const dappAmount = dappIsAssetTransfer
    ? String(dappRequestPayload?.qty || '').trim()
    : String(dappRequestPayload?.amount || dappRequestPayload?.value || '').trim()
  const dappMemo = dappIsAssetTransfer
    ? String(dappRequestPayload?.memo || '').trim()
    : String(dappRequestPayload?.memo || '').trim()
  const dappDataHex = dappIsEvmTx
    ? String((currentDappRequest?.request as DappSendEvmTransactionPayload | undefined)?.data || '').trim()
    : ''
  const dappHasWalletTx = Boolean(currentDappRequest && (dappIsAssetTransfer || currentDappRequest.method === 'wallet_sendTransaction'))

  const isAssetTransfer = isDappTxRoute && dappHasWalletTx
    ? dappIsAssetTransfer
    : (txState.requestType === 'asset' || Boolean(String(txState.assetId || '').trim()))
  const assetId = isDappTxRoute && dappHasWalletTx
    ? dappAssetId
    : String(txState.assetId || '').trim()
  const feePreviewAssetId = isDappTxRoute && dappHasWalletTx
    ? dappAssetId
    : String(txState.feePreviewAssetId || txState.assetId || '').trim()
  const assetLabel = String(txState.assetLabel || assetId || '').trim()
  const toAddress = isDappTxRoute && dappHasWalletTx
    ? dappToAddress
    : (txState.to?.trim() ?? '')
  const amount = isDappTxRoute && dappHasWalletTx
    ? dappAmount
    : (txState.amount?.trim() ?? '')
  const memo = isDappTxRoute && dappHasWalletTx
    ? dappMemo
    : String(txState.memo || '').trim()
  const displayNetworkId = isDappTxRoute && currentDappRequest
    ? currentDappRequest.networkId
    : activeNetworkId
  const displayAccountId = isDappTxRoute && currentDappRequest
    ? currentDappRequest.accountId
    : activeAccountId
  const activeAccount = accounts.find(a => a.id === displayAccountId) || accounts[0]
  const activeNetwork = networks.find(n => n.id === displayNetworkId) || networks[0]
  const activityAssetId = isAssetTransfer ? assetId : buildNativeActivityAssetId(displayNetworkId)
  const fromAddress = isDappTxRoute && currentDappRequest
    ? String(
        activeAccount?.networkAddresses?.[displayNetworkId]
        || (activeNetwork?.coinType === 'EVM' ? activeAccount?.addresses?.EVM : '')
        || (activeNetwork?.coinType === 'XRP' ? activeAccount?.addresses?.XRP : '')
        || txState.from
        || ''
      ).trim()
    : (txState.from?.trim() ?? '')
  const requestOrigin = isDappTxRoute && currentDappRequest
    ? currentDappRequest.origin
    : (String(txState.origin ?? '').trim() || 'metayoshi provider')
  const numericAmount = Number(amount)
  const safeAmount = Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : 0
  const activeModelId = resolveRuntimeModelId(activeNetwork)
  const activeAccountName = getAccountDisplayName(activeAccount, displayNetworkId, 'Account 1')
  const caps = resolveNetworkCapabilities(activeNetwork)
  const sendBlockedBySync = isSendBlockedBySync(isSyncing, syncPercent, isConnected, lowSyncStreak)
  const syncBlockedReason = getSendBlockedSyncReason(isSyncing, syncPercent, isConnected, lowSyncStreak)

  const enteredAmountNumRaw = Number((isDappTxRoute ? amount : txState.enteredAmount) ?? amount)
  const enteredAmount = Number.isFinite(enteredAmountNumRaw) && enteredAmountNumRaw > 0 ? enteredAmountNumRaw : safeAmount
  const donationEnabled = !isDappTxRoute && txState.donationEnabled === true
  const donationPercentRaw = Number(!isDappTxRoute ? txState.donationPercent ?? 0 : 0)
  const donationPercent = Number.isFinite(donationPercentRaw) && donationPercentRaw > 0 ? donationPercentRaw : 0
  const donationMode = txState.donationMode === 'deduct' ? 'deduct' : 'add'
  const donationAmountRaw = Number(txState.donationAmount ?? (donationEnabled ? (enteredAmount * donationPercent) / 100 : 0))
  const donationAmount = Number.isFinite(donationAmountRaw) && donationAmountRaw > 0 ? donationAmountRaw : 0
  const donationAddress = String(txState.donationAddress ?? '').trim()
  const donationRequired = txState.donationRequired === true
  const spendBeforeNetworkFeeRaw = Number(txState.totalBeforeNetworkFee ?? (donationEnabled && donationMode === 'add' ? safeAmount + donationAmount : enteredAmount))
  const spendBeforeNetworkFee = Number.isFinite(spendBeforeNetworkFeeRaw) && spendBeforeNetworkFeeRaw > 0 ? spendBeforeNetworkFeeRaw : safeAmount
  const fallbackEstimatedNetworkFee = estimateNetworkFeeUi(activeNetwork)
  const [estimatedNetworkFee, setEstimatedNetworkFee] = useState<number>(fallbackEstimatedNetworkFee)
  const [isEstimatingNetworkFee, setIsEstimatingNetworkFee] = useState(false)
  const [isNetworkFeeReady, setIsNetworkFeeReady] = useState(false)
  const [feePreviewMeta, setFeePreviewMeta] = useState<Pick<TransactionFeePreviewResult, 'source' | 'kind' | 'statusLabel'> | null>(null)
  const estimatedTotalCost = spendBeforeNetworkFee + estimatedNetworkFee
  const activeNetworkLogos = useMemo(
    () => networkAssetLogos?.[displayNetworkId] || EMPTY_LOGO_MAP,
    [displayNetworkId, networkAssetLogos]
  )
  const previewNetwork = useMemo(() => ({
    id: activeNetwork.id,
    symbol: activeNetwork.symbol,
    coinSymbol: activeNetwork.coinSymbol,
    rpcUrl: activeNetwork.rpcUrl,
    rpcWallet: activeNetwork.rpcWallet,
    rpcUsername: activeNetwork.rpcUsername,
    rpcPassword: activeNetwork.rpcPassword,
    bridgeUrl: activeNetwork.bridgeUrl,
    bridgeUsername: activeNetwork.bridgeUsername,
    bridgePassword: activeNetwork.bridgePassword,
    coinType: activeNetwork.coinType,
    feePerByte: activeNetwork.feePerByte,
    runtimeModelId: activeNetwork.runtimeModelId
  }), [
    activeNetwork.id,
    activeNetwork.symbol,
    activeNetwork.coinSymbol,
    activeNetwork.rpcUrl,
    activeNetwork.rpcWallet,
    activeNetwork.rpcUsername,
    activeNetwork.rpcPassword,
    activeNetwork.bridgeUrl,
    activeNetwork.bridgeUsername,
    activeNetwork.bridgePassword,
    activeNetwork.coinType,
    activeNetwork.feePerByte,
    activeNetwork.runtimeModelId
  ])
  const dappEvmRequest = isDappTxRoute && isDappEvmTransactionRequest(currentDappRequest?.request)
    ? currentDappRequest.request
    : null
  const isCustomEvmTx = Boolean(dappEvmRequest)
  const hasTxState = isDappTxRoute
    ? Boolean(currentDappRequest && (
        isAssetTransfer
          ? (assetId && toAddress && amount)
          : (isCustomEvmTx ? (dappDataHex || toAddress || amount) : (toAddress && amount))
      ))
    : Boolean(toAddress && amount)
  const recipientDisplay = toAddress || (isCustomEvmTx ? 'Contract creation / no recipient' : 'No recipient provided')
  const amountDisplay = isCustomEvmTx
    ? `${formatCoinAmount(safeAmount)} ${activeNetwork.symbol}`
    : (safeAmount > 0 ? `${safeAmount} ${isAssetTransfer ? (assetLabel || 'ASSET') : activeNetwork.symbol}` : 'No amount provided')
  const modelPreferences = getNetworkModelPreferences(displayNetworkId)
  const feePreviewRecipient = resolveFeePreviewRecipient(activeNetwork, fromAddress, toAddress)
  const hasFeePreviewInputs = Boolean(fromAddress && hasTxState)
  const availableNativeBalance = useMemo(() => {
    const scoped = parseCoinAmount(activeAccount?.networkBalances?.[displayNetworkId])
    if (scoped > 0) return scoped
    return parseCoinAmount(activeAccount?.balance)
  }, [activeAccount?.balance, activeAccount?.networkBalances, displayNetworkId])
  const fiatScopeKey = `${String(activeAccount?.id || '').trim().toLowerCase()}::${String(displayNetworkId || '').trim().toLowerCase()}`
  const scopedNativeFiatUsd = Number(accountNetworkFiatNative?.[fiatScopeKey]?.usd)
  const scopedAssetFiatUsd = Number(accountNetworkFiatAssets?.[fiatScopeKey]?.[assetId]?.usd)
  const scopedAssetRaw = Number(accountNetworkAssets?.[fiatScopeKey]?.[assetId] ?? 0)
  const nativeUsdPerCoin = useMemo(() => {
    if (!Number.isFinite(scopedNativeFiatUsd) || scopedNativeFiatUsd <= 0) return null
    if (!Number.isFinite(availableNativeBalance) || availableNativeBalance <= 0) return null
    return scopedNativeFiatUsd / availableNativeBalance
  }, [availableNativeBalance, scopedNativeFiatUsd])
  const assetUsdPerUnit = useMemo(() => {
    if (!isAssetTransfer) return null
    if (!Number.isFinite(scopedAssetFiatUsd) || scopedAssetFiatUsd <= 0) return null
    const scopedAssetUnits = scopedAssetRaw / 1e8
    if (!Number.isFinite(scopedAssetUnits) || scopedAssetUnits <= 0) return null
    return scopedAssetFiatUsd / scopedAssetUnits
  }, [isAssetTransfer, scopedAssetFiatUsd, scopedAssetRaw])
  const estimatedNetworkFeeFiat = nativeUsdPerCoin ? estimatedNetworkFee * nativeUsdPerCoin : null
  const recipientAmountFiat = isAssetTransfer
    ? (assetUsdPerUnit ? safeAmount * assetUsdPerUnit : null)
    : (nativeUsdPerCoin ? safeAmount * nativeUsdPerCoin : null)
  const donationFiat = nativeUsdPerCoin ? (donationEnabled ? donationAmount : 0) * nativeUsdPerCoin : null
  const estimatedTotalCostFiat = nativeUsdPerCoin ? estimatedTotalCost * nativeUsdPerCoin : null

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      const run = async () => {
        const fallback = estimateNetworkFeeUi(activeNetwork)
        const canFetchLivePreview = Boolean(
          fromAddress
          && (
            (activeNetwork.coinType === 'EVM' && (feePreviewRecipient || String(dappEvmRequest?.data || '').trim()))
            || (activeNetwork.coinType === 'UTXO' && feePreviewRecipient && Number(amount) > 0)
          )
        )
        if (!hasFeePreviewInputs) {
          if (!cancelled) {
            setEstimatedNetworkFee(fallback)
            setIsEstimatingNetworkFee(false)
            setIsNetworkFeeReady(false)
            setFeePreviewMeta(null)
          }
          return
        }
        if (!canFetchLivePreview) {
          if (!cancelled) {
            setEstimatedNetworkFee(fallback)
            setIsEstimatingNetworkFee(false)
            setIsNetworkFeeReady(true)
            setFeePreviewMeta({ source: 'fallback', kind: 'estimate', statusLabel: 'Fallback estimate' })
          }
          return
        }
        if (!cancelled) setIsNetworkFeeReady(false)
        setIsEstimatingNetworkFee(true)
        try {
          const preview = await estimateTransactionFeePreview({
            network: previewNetwork,
            fromAddress,
            toAddress: feePreviewRecipient,
            amount,
            assetId: feePreviewAssetId || undefined,
            assetLogos: activeNetworkLogos,
            isAssetTransfer,
            dataHex: dappEvmRequest?.data,
            gasLimit: dappEvmRequest?.gasLimit,
            gasPrice: dappEvmRequest?.gasPrice,
            maxFeePerGas: dappEvmRequest?.maxFeePerGas,
            maxPriorityFeePerGas: dappEvmRequest?.maxPriorityFeePerGas,
            type: dappEvmRequest?.type,
            gasLane: modelPreferences.evmGasLane,
            utxoFeePreset: modelPreferences.utxoFeePreset,
            utxoInputStrategy: modelPreferences.utxoInputStrategy
          })
          if (!cancelled) {
            setEstimatedNetworkFee(preview.fee || fallback)
            setIsNetworkFeeReady(true)
            setFeePreviewMeta({
              source: preview.source,
              kind: preview.kind,
              statusLabel: preview.statusLabel
            })
          }
        } catch {
          if (!cancelled) {
            setEstimatedNetworkFee(fallback)
            setIsNetworkFeeReady(true)
            setFeePreviewMeta({ source: 'fallback', kind: 'estimate', statusLabel: 'Fallback estimate' })
          }
        } finally {
          if (!cancelled) setIsEstimatingNetworkFee(false)
        }
      }
      void run()
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    previewNetwork,
    activeNetworkLogos,
    amount,
    assetId,
    feePreviewAssetId,
    dappEvmRequest,
    fromAddress,
    isAssetTransfer,
    modelPreferences.evmGasLane,
    modelPreferences.utxoFeePreset,
    modelPreferences.utxoInputStrategy,
    hasFeePreviewInputs,
    feePreviewRecipient
  ])

  const TABS = [
    { id: 'details', label: 'DETAILS' },
    { id: 'data', label: 'DATA' },
    { id: 'hex', label: 'HEX' }
  ]
  const dataTabText = useMemo(() => {
    const payload = isDappTxRoute && currentDappRequest
      ? {
          origin: currentDappRequest.origin,
          method: currentDappRequest.method,
          networkId: currentDappRequest.networkId,
          accountId: currentDappRequest.accountId,
          request: currentDappRequest.request
        }
      : {
          method: isAssetTransfer ? 'send_asset' : 'send',
          params: isAssetTransfer ? [assetId, toAddress || 'N/A', amount || '0'] : [toAddress || 'N/A', amount || '0'],
          ...(memo ? { memo } : {}),
          ...(donationEnabled && !isAssetTransfer
            ? {
                donation: {
                  enabled: true,
                  percent: donationPercent,
                  mode: donationMode,
                  amount: formatCoinAmount(donationAmount),
                  address: donationAddress || 'N/A',
                  required: donationRequired
                }
              }
            : {})
        }
    try {
      return JSON.stringify(payload, null, 2)
    } catch {
      return String(payload)
    }
  }, [
    amount,
    assetId,
    donationAddress,
    donationAmount,
    donationEnabled,
    donationMode,
    donationPercent,
    donationRequired,
    isAssetTransfer,
    isDappTxRoute,
    memo,
    currentDappRequest,
    toAddress
  ])
  const hexTabText = dappDataHex || String(txState.dataHex || '').trim() || 'No hex data for this transfer'

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
    if (isDappTxRoute && loadingDappRequest) {
      setSubmitError('Loading transaction request')
      return
    }
    if (isDappTxRoute && !pendingDappRequest) {
      setSubmitError('No pending dapp transaction to confirm')
      return
    }
    if (!hasTxState) {
      setSubmitError('No pending transaction to confirm')
      return
    }
    if (isCustomEvmTx) {
      if (!toAddress && !dappDataHex) {
        setSubmitError('Transaction data is invalid')
        return
      }
    } else if (!toAddress || safeAmount <= 0) {
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
    if (isAssetTransfer && availableNativeBalance + 1e-12 < estimatedNetworkFee) {
      setSubmitError(`Insufficient ${activeNetwork.symbol} for network fee. Required ~${formatCoinAmount(estimatedNetworkFee)} ${activeNetwork.symbol}, available ${formatCoinAmount(availableNativeBalance)} ${activeNetwork.symbol}.`)
      return
    }
    if (!isAssetTransfer && availableNativeBalance + 1e-12 < estimatedTotalCost) {
      setSubmitError(`Insufficient balance for amount + fee. Required ~${formatCoinAmount(estimatedTotalCost)} ${activeNetwork.symbol}, available ${formatCoinAmount(availableNativeBalance)} ${activeNetwork.symbol}.`)
      return
    }
    if (activeNetwork.coinType === 'UTXO' && donationEnabled && donationRequired && donationAmount > 0 && !donationAddress) {
      setSubmitError('Donation address missing from server policy/config')
      return
    }
    setIsSubmitting(true)
    const sendTraceId = `wallet-send-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    console.info(`[${sendTraceId}] submitting transaction`, {
      networkId: activeNetwork.id,
      accountId: activeAccount?.id,
      isAssetTransfer,
      assetId: isAssetTransfer ? assetId : undefined,
      amount,
      toAddress,
      fromAddress,
      requestOrigin: isDappTxRoute ? requestOrigin : undefined
    })
    const previousNetworkId = String(activeNetworkId || '').trim()
    const previousAccountId = String(activeAccountId || '').trim()
    const shouldRestoreNetwork = Boolean(isDappTxRoute && pendingDappRequest && previousNetworkId && previousNetworkId !== pendingDappRequest.networkId)
    const shouldRestoreAccount = Boolean(isDappTxRoute && pendingDappRequest && previousAccountId && previousAccountId !== pendingDappRequest.accountId)

    try {
      if (isDappTxRoute && pendingDappRequest) {
        if (!canUseChromeStorage()) {
          throw new Error('Extension storage is unavailable')
        }

        await chrome.storage.local.set({
          [DAPP_PENDING_REQUEST_STORAGE_KEY]: {
            ...pendingDappRequest,
            status: 'approved',
            updatedAt: Date.now()
          }
        })

        if (activeNetworkId !== pendingDappRequest.networkId) {
          await setActiveNetwork(pendingDappRequest.networkId)
        }
        if (activeAccountId !== pendingDappRequest.accountId) {
          setActiveAccount(pendingDappRequest.accountId)
        }
      }

      let txHash = ''
      let txResult: any = null
      if (isAssetTransfer) {
        if (!assetId) throw new Error('Asset id missing from transaction request')
        const sent = await sendAssetTransfer({
          assetId,
          qty: amount,
          toAddress: toAddress,
          memo
        })
        txResult = sent
        txHash = String(sent.txid || '').trim()
      } else if (activeNetwork.coinType === 'EVM') {
        const res = await sendEvmTransaction(
          dappEvmRequest
            ? {
                to: toAddress || undefined,
                value: amount,
                data: String(dappEvmRequest.data || '').trim() || undefined,
                gasLimit: String(dappEvmRequest.gasLimit || '').trim() || undefined,
                gasPrice: String(dappEvmRequest.gasPrice || '').trim() || undefined,
                maxFeePerGas: String(dappEvmRequest.maxFeePerGas || '').trim() || undefined,
                maxPriorityFeePerGas: String(dappEvmRequest.maxPriorityFeePerGas || '').trim() || undefined,
                type: dappEvmRequest.type
              }
            : { to: toAddress, amount }
        )
        txResult = res
        txHash = String(res.hash || '').trim()
      } else if (activeNetwork.coinType === 'XRP') {
        const res = await sendXrpTransaction({ to: toAddress, amount })
        txResult = res
        txHash = String(res.hash || '').trim()
      } else if (activeModelId === 'ada') {
        const res = await sendCardanoTransaction({ to: toAddress, amount })
        txResult = res
        txHash = String(res.hash || '').trim()
      } else if (activeModelId === 'xmr') {
        const res = await sendMoneroTransaction({ to: toAddress, amount })
        txResult = res
        txHash = String(res.hash || '').trim()
      } else if (activeModelId === 'sol') {
        const res = await sendSolanaTransaction({ to: toAddress, amount })
        txResult = res
        txHash = String(res.hash || '').trim()
      } else if (activeModelId === 'sui') {
        const res = await sendSuiTransaction({ to: toAddress, amount })
        txResult = res
        txHash = String(res.hash || '').trim()
      } else if (activeModelId === 'xlm') {
        const res = await sendStellarTransaction({ to: toAddress, amount })
        txResult = res
        txHash = String(res.hash || '').trim()
      } else if (activeModelId === 'tron') {
        const res = await sendTronTransaction({ to: toAddress, amount })
        txResult = res
        txHash = String(res.hash || '').trim()
      } else if (isCosmosLikeModelId(activeModelId)) {
        const res = await sendUtxoTransaction({ to: toAddress, amount, memo })
        txResult = res
        txHash = String(res.hash || '').trim()
      } else if (activeNetwork.coinType === 'UTXO') {
        const res = await sendUtxoTransaction({
          to: toAddress,
          amount,
          memo,
          donation: donationEnabled
            ? {
                address: donationAddress,
                amount: formatCoinAmount(donationAmount),
                required: donationRequired
              }
            : undefined
        })
        txResult = res
        txHash = String(res.hash || '').trim()
      } else {
        throw new Error(`Unsupported coin type: ${activeNetwork.coinType}`)
      }
      if (!txHash) throw new Error('Transaction sent but hash is missing')
      console.info(`[${sendTraceId}] transaction accepted`, {
        networkId: activeNetwork.id,
        txHash,
        isAssetTransfer,
        assetId: isAssetTransfer ? assetId : undefined
      })
      
      addActivity({
        id: txHash,
        type: 'sent',
        asset: isAssetTransfer ? (assetLabel || assetId || 'ASSET') : activeNetwork.symbol,
        assetId: activityAssetId || undefined,
        amount: amount,
        from: fromAddress || '',
        to: toAddress || undefined,
        accountId: activeAccount?.id,
        status: 'pending',
        timestamp: Date.now(),
        networkId: activeNetwork.id
      })
      trackActivityTransactionStatus({ txid: txHash, networkId: activeNetwork.id })
      void refreshActiveBalance({ fast: true, skipZeroBalanceRecheck: true }).catch((err) => {
        console.warn('Post-send fast balance refresh failed:', err)
      })

      if (isDappTxRoute && pendingDappRequest) {
        await chrome.storage.local.set({
          [DAPP_PENDING_REQUEST_STORAGE_KEY]: {
            ...pendingDappRequest,
            status: 'executed',
            result: txResult,
            updatedAt: Date.now()
          }
        })
      }

      const resultState: TxResultState = {
        txid: txHash,
        networkId: activeNetwork.id,
        accountId: activeAccount?.id,
        asset: isAssetTransfer ? (assetLabel || assetId || 'ASSET') : activeNetwork.symbol,
        assetId: activityAssetId || undefined,
        amount: amount || '0',
        from: fromAddress || '',
        to: toAddress || undefined,
        status: 'pending',
        origin: isDappTxRoute ? requestOrigin : undefined,
        requestMethod: isDappTxRoute ? currentDappRequest?.method : undefined,
        returnTo: txState.returnTo,
        returnLabel: txState.returnLabel
      }
      navigate('/tx/result', { replace: true, state: resultState })
    } catch (e: any) {
      const message = String(e?.message ?? 'Transaction failed')
      const tracedMessage = `${message} [trace ${sendTraceId}]`
      console.error(`[${sendTraceId}] transaction failed`, {
        networkId: activeNetwork.id,
        isAssetTransfer,
        assetId: isAssetTransfer ? assetId : undefined,
        amount,
        toAddress,
        fromAddress,
        message
      })
      setSubmitError(tracedMessage)
      if (isDappTxRoute && pendingDappRequest && canUseChromeStorage()) {
        await chrome.storage.local.set({
          [DAPP_PENDING_REQUEST_STORAGE_KEY]: {
            ...pendingDappRequest,
            status: 'failed',
            error: { code: -32603, message },
            updatedAt: Date.now()
          }
        })
      }
    } finally {
      if (isDappTxRoute && pendingDappRequest) {
        try {
          if (shouldRestoreAccount) {
            setActiveAccount(previousAccountId)
          }
          if (shouldRestoreNetwork) {
            await setActiveNetwork(previousNetworkId, { skipRefresh: true })
          }
        } catch {
          // Keep the dapp request outcome authoritative even if UI restoration fails.
        }
      }
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (isDappTxRoute && pendingDappRequest && canUseChromeStorage()) {
      await chrome.storage.local.set({
        [DAPP_PENDING_REQUEST_STORAGE_KEY]: {
          ...pendingDappRequest,
          status: 'rejected',
          error: { code: 4001, message: 'User rejected the request' },
          updatedAt: Date.now()
        }
      })
      navigate('/wallet/assets')
      return
    }
    if (!hasTxState) {
      navigate('/wallet/activity')
      return
    }
    addActivity({
      id: Math.random().toString(36).substr(2, 9),
      type: 'sent',
      asset: isAssetTransfer ? (assetLabel || assetId || 'ASSET') : activeNetwork.symbol,
      assetId: activityAssetId || undefined,
      amount: amount,
      from: fromAddress || '',
      to: toAddress,
      accountId: activeAccount?.id,
      status: 'rejected',
      timestamp: Date.now(),
      networkId: activeNetwork.id
    })
    navigate('/wallet/activity')
  }

  const content = (
    <div className="flex min-h-0 h-full flex-col bg-dark-800">
      <header className="shrink-0 px-4 py-2 bg-dark-900 border-b border-dark-600 flex items-center justify-between">
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

      <div className="flex-1 min-h-0 p-4 space-y-4 overflow-y-auto custom-scrollbar">
        {isDappTxRoute && loadingDappRequest && (
          <div className="p-3 bg-dark-900/60 border border-dark-600 rounded-xl text-xs text-gray-300">
            Loading dapp transaction request...
          </div>
        )}

        {isDappTxRoute && !loadingDappRequest && !pendingDappRequest && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-xs text-red-300">
            No pending dapp transaction request was found.
          </div>
        )}

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
                  {toAddress
                    ? (toAddress.length > 12 ? `${toAddress.slice(0, 6)}...${toAddress.slice(-6)}` : toAddress)
                    : 'Contract / broadcast'}
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
              {recipientDisplay}
            </p>
            <p className="text-[11px] font-mono text-gray-300">
              {amountDisplay}
            </p>
            {memo && (
              <p className="text-[11px] font-mono text-gray-400 break-all">Memo: {memo}</p>
            )}
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
                    <p className="text-[10px] text-gray-500">
                      {feePreviewMeta?.statusLabel || 'Waiting for fee quote'}
                    </p>
                 </div>
                 <div className="text-right">
                    <p className="text-xs font-bold">{formatCoinAmount(estimatedNetworkFee)}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{activeNetwork.symbol}</p>
                    {estimatedNetworkFeeFiat !== null && (
                      <p className="text-[10px] text-gray-400">{formatFiatValue(estimatedNetworkFeeFiat)}</p>
                    )}
                    <p className="text-[9px] text-gray-500">
                      {isEstimatingNetworkFee
                        ? 'Updating from network...'
                        : feePreviewMeta?.kind === 'max-cap'
                          ? 'Maximum possible fee before submission. Final paid fee may be lower.'
                          : feePreviewMeta?.source === 'live'
                            ? 'Live network estimate. Final paid fee is known only after execution.'
                            : 'Fallback estimate. Live pricing unavailable.'}
                    </p>
                    {!isEstimatingNetworkFee && hasFeePreviewInputs && !isNetworkFeeReady && (
                      <p className="text-[9px] text-gray-500">Fee must be resolved before confirmation.</p>
                    )}
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
                    {recipientAmountFiat !== null && (
                      <p className="text-[10px] text-gray-400">{formatFiatValue(recipientAmountFiat)}</p>
                    )}
                    {donationEnabled && donationMode === 'deduct' && !isAssetTransfer && (
                      <p className="text-[9px] text-gray-500">Entered: <span className="font-bold">{formatCoinAmount(enteredAmount)} {activeNetwork.symbol}</span></p>
                    )}
                  </div>
              </div>

              {memo && (
                <>
                  <div className="divider" />

                  <div className="flex justify-between items-start gap-4">
                     <div className="space-y-0.5">
                        <p className="text-[12px] font-bold">Memo</p>
                        <p className="text-[10px] text-gray-500">Included in the signed on-chain payload</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[11px] font-mono break-all max-w-[180px] text-gray-300">{memo}</p>
                     </div>
                  </div>
                </>
              )}

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
                        {estimatedTotalCostFiat !== null && (
                          <p className="text-[10px] text-gray-400">{formatFiatValue(estimatedTotalCostFiat)}</p>
                        )}
                        <p className="text-[9px] text-gray-500">
                          Network fee: <span className="font-bold">{formatCoinAmount(estimatedNetworkFee)} {activeNetwork.symbol}</span>
                          {estimatedNetworkFeeFiat !== null ? <span className="font-bold"> ({formatFiatValue(estimatedNetworkFeeFiat)})</span> : null}
                        </p>
                        {donationEnabled && (
                          <p className="text-[9px] text-gray-500">
                            Additional donation: <span className="font-bold">{formatCoinAmount(donationAmount)} {activeNetwork.symbol}</span>
                            {donationFiat !== null ? <span className="font-bold"> ({formatFiatValue(donationFiat)})</span> : null}
                          </p>
                        )}
                     </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'data' && (
            <pre className="bg-dark-900 p-4 rounded-xl border border-dark-600 font-mono text-[10px] text-gray-400 whitespace-pre-wrap break-all">{dataTabText}</pre>
          )}

          {activeTab === 'hex' && (
            <div className="bg-dark-900 p-4 rounded-xl border border-dark-600 font-mono text-[10px] text-gray-500 break-all leading-tight">
              {hexTabText}
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

      <footer className="shrink-0 p-4 border-t border-dark-600 flex gap-4 mt-auto">
        <Button 
          variant="outline" 
          className="flex-1 btn-outline"
          onClick={() => { void handleReject() }}
        >
          Reject
        </Button>
        <Button
          className="flex-1 btn-primary"
          onClick={handleConfirm}
          disabled={
            isRejectMode
            || isSubmitting
            || (hasFeePreviewInputs && (!isNetworkFeeReady || isEstimatingNetworkFee))
            || loadingDappRequest
            || (isDappTxRoute && !pendingDappRequest)
            || !(isAssetTransfer ? caps.features.assetSend : caps.features.nativeSend)
            || !hasTxState
            || sendBlockedBySync
          }
          isLoading={isSubmitting}
        >
          Confirm
        </Button>
      </footer>
    </div>
  )

  if (isDappTxRoute && isLocked) {
    return (
      <PasswordGate
        title="Unlock to confirm transfer"
        description="Unlock your wallet to review this website transfer and press Confirm."
      >
        {content}
      </PasswordGate>
    )
  }

  return content
}

export const TxConfirm: React.FC = () => <TxLayout title="CONFIRM TRANSFER" />
export const TxReject: React.FC = () => <TxLayout title="REJECT" error="Insufficient funds" isRejectMode />

export default TxConfirm

