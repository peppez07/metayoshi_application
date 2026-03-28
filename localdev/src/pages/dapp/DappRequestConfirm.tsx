import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { PasswordGate } from '../../components/PasswordGate'
import {
  DAPP_PENDING_REQUEST_STORAGE_KEY,
  parseDappPendingRequest,
  type DappPendingRequest,
  type DappSendEvmTransactionPayload
} from '../../lib/dappPermissions'
import { getAccountAddressForNetwork, getAccountKindLabel, isMultisigAccount } from '../../lib/multisig'
import { deriveUtxoAddress } from '../../lib/utxoAddress'
import {
  createRtmMarketRpcConfig,
  executeRtmMarketAction,
  loadRtmMarketOrder,
  assertRtmMarketActionMatchesOrder,
  type RtmMarketAction,
  type RtmMarketOrderSnapshot
} from '../../lib/rtmHtlc'
import {
  executeRtmIssuerAction,
  loadRtmIssuerDraft,
  assertRtmIssuerActionMatchesDraft,
  type RtmIssuerAction,
  type RtmIssuerDraftSnapshot
} from '../../lib/rtmIssuer'
import { useWalletStore } from '../../store/walletStore'
import { buildNativeActivityAssetId } from '../../lib/activityIdentity'
import { getDappRequestDisplayType, isAuthSignatureMessage, isNonBroadcastRequestMethod } from '../../lib/dappRequestDescriptors'
import { getSendBlockedSyncReason, isSendBlockedBySync } from '../../lib/sendSyncPolicy'
import { isCosmosLikeModelId, resolveRuntimeModelId } from '../../lib/runtimeModel'
import {
  broadcastCosmosTx,
  signCosmosAmino,
  deriveCosmosKeyData,
  signCosmosDirect,
  signEvmMessage,
  signRtmMessage,
  signEvmTransaction,
  signEvmTypedData,
  signAndSendEvmTransaction,
  signSolanaMessage,
  signSolanaTransaction,
  signSolanaTransactions,
  signAndSendSolanaTransaction
} from '../../lib/dappSigning'

function canUseChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
}

function isDappEvmTransactionRequest(request: DappPendingRequest['request'] | null | undefined): request is DappSendEvmTransactionPayload {
  return Boolean(request && typeof request === 'object' && 'data' in request)
}

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' ? value as Record<string, any> : null
}

function previewJson(value: unknown, maxLength = 240): string {
  try {
    const json = JSON.stringify(value)
    if (!json) return ''
    return json.length > maxLength ? `${json.slice(0, maxLength)}...` : json
  } catch {
    return String(value ?? '')
  }
}

function formatBpsPercent(bps: number): string {
  return `${(bps / 100).toFixed(2).replace(/\.?0+$/, '')}%`
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
}

const DappRequestConfirm: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    isLocked,
    accounts,
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
    sendSuiTransaction,
    sendStellarTransaction,
    sendTronTransaction,
    sendUtxoTransaction,
    sendAssetTransfer,
    signBackendAuthMessage,
    collectActiveNetworkData,
    addActivity,
    trackActivityTransactionStatus,
    isConnected,
    isSyncing,
    syncPercent,
    lowSyncStreak
  } = useWalletStore()
  const [pendingRequest, setPendingRequest] = useState<DappPendingRequest | null>(null)
  const [loadingRequest, setLoadingRequest] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [rtmMarketOrder, setRtmMarketOrder] = useState<RtmMarketOrderSnapshot | null>(null)
  const [rtmMarketVerificationError, setRtmMarketVerificationError] = useState('')
  const [rtmMarketVerificationLoading, setRtmMarketVerificationLoading] = useState(false)
  const [rtmIssuerDraft, setRtmIssuerDraft] = useState<RtmIssuerDraftSnapshot | null>(null)
  const [rtmIssuerVerificationError, setRtmIssuerVerificationError] = useState('')
  const [rtmIssuerVerificationLoading, setRtmIssuerVerificationLoading] = useState(false)

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
  const requestModelId = resolveRuntimeModelId(requestNetwork)
  const requestPayload = asRecord(pendingRequest?.request)
  const requestMethod = String(pendingRequest?.method || '').trim()
  const requestAccount = accounts.find((account) => account.id === pendingRequest?.accountId) || accounts[0]
  const requestAccountKindLabel = getAccountKindLabel(requestAccount)
  const requestAccountIsMultisig = isMultisigAccount(requestAccount)
  const requestIsAssetSend = pendingRequest?.method === 'wallet_sendAsset'
  const requestIsRtmMarketAction = requestMethod === 'wallet_rtmMarketAction'
  const requestIsRtmIssuerAction = requestMethod === 'wallet_rtmIssuerAction'
  const requestIsRtmGetPublicKey = requestMethod === 'wallet_rtmGetPublicKey'
  const requestIsRtmSignMessage = requestMethod === 'wallet_rtmSignMessage'
  const requestIsEvmTx = !requestIsAssetSend && isDappEvmTransactionRequest(pendingRequest?.request)
  const rtmMarketAction = (requestIsRtmMarketAction ? pendingRequest?.request : null) as RtmMarketAction | null
  const rtmIssuerAction = (requestIsRtmIssuerAction ? pendingRequest?.request : null) as RtmIssuerAction | null
  const requestIsSignMessage = requestMethod === 'wallet_signMessage' || requestIsRtmSignMessage
  const requestIsSignTypedData = requestMethod === 'wallet_signTypedData'
  const requestIsSignTransaction = requestMethod === 'wallet_signTransaction'
  const requestIsSignAllTransactions = requestMethod === 'wallet_signAllTransactions'
  const requestIsSignAndSendTransaction = requestMethod === 'wallet_signAndSendTransaction'
  const requestIsCosmosSignDirect = requestMethod === 'wallet_cosmosSignDirect'
  const requestIsCosmosSignAmino = requestMethod === 'wallet_cosmosSignAmino'
  const requestIsCosmosSendTx = requestMethod === 'wallet_cosmosSendTx'
  const requestIsCosmosGetKey = requestMethod === 'wallet_cosmosGetKey'
  const requestIsAuthSignature = requestIsSignMessage && isAuthSignatureMessage(requestPayload?.message)
  const normalizedRequestTypeLabel = getDappRequestDisplayType(pendingRequest)
  const requestTypeLabel = requestAccountIsMultisig
    ? (
        requestIsSignMessage
        || requestIsSignTypedData
        || requestIsSignTransaction
        || requestIsSignAllTransactions
        || requestIsSignAndSendTransaction
          ? 'Unsupported Multisig Signature'
          : requestIsAssetSend
          ? 'Multisig Asset Proposal'
          : requestIsEvmTx
          ? 'Multisig Proposal'
          : 'Multisig Transfer'
      )
    : requestIsAssetSend
    ? 'Asset Transfer'
    : requestIsAuthSignature
    ? 'Auth Signature'
    : requestIsSignMessage
    ? 'Message Signature'
    : requestIsSignTypedData
    ? 'Typed Data Signature'
    : requestIsSignTransaction
    ? 'Transaction Signature'
    : requestIsSignAllTransactions
    ? 'Batch Transaction Signature'
    : requestIsSignAndSendTransaction
    ? 'Sign And Send Transaction'
    : requestIsCosmosSignDirect
    ? 'Cosmos Direct Signature'
    : requestIsCosmosSignAmino
    ? 'Cosmos Amino Signature'
    : requestIsCosmosGetKey
    ? 'Cosmos Account Access'
    : requestIsCosmosSendTx
    ? 'Cosmos Broadcast'
    : requestIsRtmMarketAction
    ? `RTM Market Action${rtmMarketAction?.kind ? ` (${String(rtmMarketAction.kind).replaceAll('_', ' ')})` : ''}`
    : requestIsRtmIssuerAction
    ? `RTM Issuer Action${rtmIssuerAction?.kind ? ` (${String(rtmIssuerAction.kind).replaceAll('_', ' ')})` : ''}`
    : requestIsEvmTx
    ? (String((pendingRequest?.request as DappSendEvmTransactionPayload | undefined)?.to || '').trim() ? 'Contract Call' : 'Contract Deployment')
    : normalizedRequestTypeLabel
  const requestTo = requestIsAssetSend
    ? String((pendingRequest?.request as any)?.toAddress || '')
    : requestIsRtmMarketAction
    ? String(rtmMarketAction?.toAddress || rtmMarketAction?.fromAddress || '')
    : requestIsRtmIssuerAction
    ? String(rtmIssuerAction?.ownerAddress || '')
    : requestIsRtmGetPublicKey
    ? String(requestPayload?.address || '')
    : requestIsAuthSignature
    ? ''
    : requestIsSignMessage
    ? String(requestPayload?.address || requestPayload?.signer || '')
    : requestIsSignTypedData
    ? String(requestPayload?.address || requestPayload?.signer || '')
    : requestIsSignTransaction || requestIsSignAndSendTransaction
    ? String(requestPayload?.to || requestPayload?.address || '').trim() || 'Serialized Transaction'
    : requestIsCosmosSignDirect || requestIsCosmosSignAmino
    ? String(requestPayload?.signerAddress || requestPayload?.address || '')
    : requestIsCosmosGetKey
    ? String(requestPayload?.chainId || '')
    : requestIsCosmosSendTx
    ? String(requestPayload?.chainId || requestPayload?.mode || '').trim() || 'Broadcast'
    : requestIsEvmTx
    ? String((pendingRequest?.request as DappSendEvmTransactionPayload | undefined)?.to || '').trim() || 'Contract Creation'
    : String((pendingRequest?.request as any)?.to || '')
  const requestAmount = requestIsAssetSend
    ? String((pendingRequest?.request as any)?.qty || '')
    : requestIsRtmMarketAction
    ? String(rtmMarketAction?.qty || rtmMarketAction?.amount || '')
    : requestIsRtmIssuerAction
    ? String(rtmIssuerAction?.initialSupply || '')
    : requestIsRtmGetPublicKey
    ? 'Public key access'
    : requestIsAuthSignature
    ? `${String(requestPayload?.message || '').length} bytes`
    : requestIsSignMessage
    ? `${String(requestPayload?.message || '').length} bytes`
    : requestIsSignTypedData
    ? 'Typed payload'
    : requestIsSignTransaction || requestIsSignAndSendTransaction
    ? String(requestPayload?.value || requestPayload?.amount || '')
    : requestIsSignAllTransactions
    ? `${Array.isArray(requestPayload?.serializedTxsBase64) ? requestPayload?.serializedTxsBase64.length : 0} txs`
    : requestIsCosmosSignDirect || requestIsCosmosSignAmino
    ? String(requestPayload?.chainId || '')
    : requestIsCosmosGetKey
    ? 'Account metadata'
    : requestIsCosmosSendTx
    ? String(requestPayload?.mode || '')
    : requestIsEvmTx
    ? String(
      (pendingRequest?.request as DappSendEvmTransactionPayload | undefined)?.value
      || (pendingRequest?.request as DappSendEvmTransactionPayload | undefined)?.amount
      || '0'
    )
    : String((pendingRequest?.request as any)?.amount || '')
  const multisigUnsupportedReason = requestAccountIsMultisig
    ? 'Multisig accounts are wallet-managed only in this build. Dapp message signing, typed data, and direct transaction requests stay disabled.'
    : ''
  const requestMemo = String((pendingRequest?.request as any)?.memo || '').trim()
  const requestAssetId = requestIsAssetSend
    ? String((pendingRequest?.request as any)?.assetId || '')
    : requestIsRtmMarketAction
    ? String(rtmMarketAction?.assetId || '')
    : requestIsRtmIssuerAction
    ? String(rtmIssuerAction?.subName ? `${rtmIssuerAction.rootName}|${rtmIssuerAction.subName}` : rtmIssuerAction?.rootName || '')
    : ''
  const requestData = requestIsEvmTx
    ? String((pendingRequest?.request as DappSendEvmTransactionPayload | undefined)?.data || '').trim()
    : ''
  const requestGasLimit = requestIsEvmTx
    ? String((pendingRequest?.request as DappSendEvmTransactionPayload | undefined)?.gasLimit || '').trim()
    : ''
  const requestGasPrice = requestIsEvmTx
    ? String((pendingRequest?.request as DappSendEvmTransactionPayload | undefined)?.gasPrice || '').trim()
    : ''
  const requestMaxFeePerGas = requestIsEvmTx
    ? String((pendingRequest?.request as DappSendEvmTransactionPayload | undefined)?.maxFeePerGas || '').trim()
    : ''
  const requestMaxPriorityFeePerGas = requestIsEvmTx
    ? String((pendingRequest?.request as DappSendEvmTransactionPayload | undefined)?.maxPriorityFeePerGas || '').trim()
    : ''
  const requestTxType = requestIsEvmTx
    ? (pendingRequest?.request as DappSendEvmTransactionPayload | undefined)?.type
    : undefined
  const requestPreview = requestIsSignMessage
    ? previewJson(requestPayload?.message || '')
    : requestIsRtmGetPublicKey
    ? previewJson({ networkId: requestPayload?.networkId || 'rtm', address: requestPayload?.address || '' })
    : requestIsSignTypedData
    ? previewJson(requestPayload?.typedData)
    : requestIsSignTransaction || requestIsSignAndSendTransaction
    ? previewJson(requestPayload?.tx || requestPayload)
    : requestIsCosmosSignDirect || requestIsCosmosSignAmino
    ? previewJson(requestPayload?.signDoc || requestPayload)
    : requestIsCosmosGetKey
    ? previewJson({ chainId: requestPayload?.chainId, network: requestNetwork?.name })
    : requestIsCosmosSendTx
    ? previewJson({ mode: requestPayload?.mode, txBytesBase64: String(requestPayload?.txBytesBase64 || '').slice(0, 48) })
    : requestIsRtmMarketAction
    ? previewJson(rtmMarketAction)
    : requestIsRtmIssuerAction
    ? previewJson(rtmIssuerAction)
    : ''
  const rtmFeeBps = requestIsRtmMarketAction ? Number(rtmMarketAction?.feeBps ?? rtmMarketOrder?.platformFeeBps ?? 0) : 0
  const rtmFeeAmount = requestIsRtmMarketAction ? String(rtmMarketAction?.feeAmount ?? rtmMarketOrder?.platformFeeAmountRtm ?? '') : ''
  const rtmFeeRecipient = requestIsRtmMarketAction
    ? String(rtmMarketAction?.feeRecipientAddress ?? rtmMarketOrder?.platformFeeAddress ?? '')
    : ''
  const rtmGrossAmount = requestIsRtmMarketAction
    ? String(rtmMarketAction?.grossAmount ?? rtmMarketOrder?.priceRtm ?? '')
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

  useEffect(() => {
    if (!pendingRequest) return
    const isWalletSendRoute =
      pendingRequest.method === 'wallet_sendAsset'
      || (pendingRequest.method === 'wallet_sendTransaction' && !requestIsEvmTx)
    if (!isWalletSendRoute) return
    navigate(`/tx/confirm?dappRequest=1&id=${encodeURIComponent(pendingRequest.id)}`, { replace: true })
  }, [navigate, pendingRequest, requestIsEvmTx])

  useEffect(() => {
    if (!requestIsRtmMarketAction || !rtmMarketAction?.orderId) {
      setRtmMarketOrder(null)
      setRtmMarketVerificationError('')
      setRtmMarketVerificationLoading(false)
      return
    }

    let cancelled = false
    setRtmMarketVerificationLoading(true)
    setRtmMarketVerificationError('')

    void (async () => {
      try {
        const order = await loadRtmMarketOrder(rtmMarketAction.orderId)
        assertRtmMarketActionMatchesOrder(rtmMarketAction, order)
        if (cancelled) return
        setRtmMarketOrder(order)
      } catch (error) {
        if (cancelled) return
        setRtmMarketOrder(null)
        setRtmMarketVerificationError(error instanceof Error ? error.message : String(error))
      } finally {
        if (!cancelled) setRtmMarketVerificationLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [requestIsRtmMarketAction, rtmMarketAction])

  useEffect(() => {
    if (!requestIsRtmIssuerAction || !rtmIssuerAction?.draftId) {
      setRtmIssuerDraft(null)
      setRtmIssuerVerificationError('')
      setRtmIssuerVerificationLoading(false)
      return
    }

    let cancelled = false
    setRtmIssuerVerificationLoading(true)
    setRtmIssuerVerificationError('')

    void (async () => {
      try {
        const draft = await loadRtmIssuerDraft(rtmIssuerAction.draftId)
        assertRtmIssuerActionMatchesDraft(rtmIssuerAction, draft)
        if (cancelled) return
        setRtmIssuerDraft(draft)
      } catch (error) {
        if (cancelled) return
        setRtmIssuerDraft(null)
        setRtmIssuerVerificationError(error instanceof Error ? error.message : String(error))
      } finally {
        if (!cancelled) setRtmIssuerVerificationLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [requestIsRtmIssuerAction, rtmIssuerAction])

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
  }

  const approveRequest = async (): Promise<void> => {
    if (!pendingRequest || isSubmitting) return
    setSubmitError('')
    if (sendBlockedBySync) {
      setSubmitError(syncBlockedReason)
      return
    }
    if (requestAccountIsMultisig && (
      requestIsSignMessage
      || requestIsSignTypedData
      || requestIsSignTransaction
      || requestIsSignAllTransactions
      || requestIsSignAndSendTransaction
      || requestIsRtmGetPublicKey
      || requestIsCosmosSignDirect
      || requestIsCosmosSignAmino
      || requestIsRtmMarketAction
      || requestIsRtmIssuerAction
    )) {
      setSubmitError('This multisig account does not support dapp-driven signing or send requests in this build')
      return
    }
    if (requestIsRtmMarketAction) {
      const action = rtmMarketAction
      if (!action) {
        setSubmitError('Missing RTM market action payload')
        return
      }
      try {
        const verifiedOrder = await loadRtmMarketOrder(action.orderId)
        assertRtmMarketActionMatchesOrder(action, verifiedOrder)
        setRtmMarketOrder(verifiedOrder)
        setRtmMarketVerificationError('')
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : String(error))
        return
      }
    }
    if (requestIsRtmIssuerAction) {
      const action = rtmIssuerAction
      if (!action) {
        setSubmitError('Missing RTM issuer action payload')
        return
      }
      try {
        const verifiedDraft = await loadRtmIssuerDraft(action.draftId)
        assertRtmIssuerActionMatchesDraft(action, verifiedDraft)
        setRtmIssuerDraft(verifiedDraft)
        setRtmIssuerVerificationError('')
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : String(error))
        return
      }
    }
    setIsSubmitting(true)
    const previousNetworkId = String(activeNetworkId || '').trim()
    const previousAccountId = String(activeAccountId || '').trim()
    const shouldRestoreNetwork = Boolean(previousNetworkId) && previousNetworkId !== pendingRequest.networkId
    const shouldRestoreAccount = Boolean(previousAccountId) && previousAccountId !== pendingRequest.accountId

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

      const latestBeforeRequest = useWalletStore.getState()
      const accountForRequest = latestBeforeRequest.accounts.find((a) => a.id === pendingRequest.accountId) || latestBeforeRequest.accounts[0]
      const accountIndex = Number.isInteger(accountForRequest?.derivationIndex)
        ? Number(accountForRequest?.derivationIndex)
        : Math.max(0, latestBeforeRequest.accounts.findIndex((a) => a.id === pendingRequest.accountId))
      const mnemonic = String(latestBeforeRequest.sessionMnemonic || '').trim()
      if (
        (requestIsSignMessage
          || requestIsSignTypedData
          || requestIsSignTransaction
          || requestIsSignAllTransactions
          || requestIsSignAndSendTransaction
          || requestIsRtmGetPublicKey
          || requestIsCosmosSignDirect
          || requestIsCosmosSignAmino)
        && !mnemonic
      ) {
        throw new Error('Wallet is locked')
      }

      const tx = requestIsAssetSend
        ? await sendAssetTransfer({
            assetId: requestAssetId,
            qty: requestAmount,
            toAddress: requestTo,
            memo: requestMemo
          })
        : requestIsRtmMarketAction
        ? await (async () => {
            if (String(requestNetwork?.id || '').trim() !== 'rtm') {
              throw new Error('RTM market actions require the RTM network')
            }
            if (!accountForRequest) {
              throw new Error('No account available for RTM market action')
            }
            const senderAddress = String(
              getAccountAddressForNetwork(accountForRequest, requestNetwork.id, requestNetwork.coinType) || ''
            ).trim()
            if (!senderAddress) {
              throw new Error('No RTM address available for RTM market action')
            }
            const derived = await deriveUtxoAddress(mnemonic, 'RTM', accountIndex)
            if (String(derived.address || '').trim() !== senderAddress) {
              throw new Error('Active RTM signer does not match the selected account')
            }
            const action = rtmMarketAction
            if (!action) throw new Error('Missing RTM market action payload')
            if (action.kind === 'fund_seller_asset') {
              return await sendAssetTransfer({
                assetId: String(action.assetId || ''),
                qty: String(action.qty || ''),
                toAddress: String(action.toAddress || '')
              })
            }
            if (action.kind === 'fund_seller_fee' || action.kind === 'fund_buyer_rtm') {
              return await sendUtxoTransaction({
                to: String(action.toAddress || ''),
                amount: String(action.amount || '')
              })
            }
            return await executeRtmMarketAction({
              action,
              rpcConfig: createRtmMarketRpcConfig(requestNetwork, signBackendAuthMessage),
              privateKeyHex: derived.privHex
            })
          })()
        : requestIsRtmIssuerAction
        ? await (async () => {
            if (String(requestNetwork?.id || '').trim() !== 'rtm') {
              throw new Error('RTM issuer actions require the RTM network')
            }
            if (!accountForRequest) {
              throw new Error('No account available for RTM issuer action')
            }
            const senderAddress = String(
              getAccountAddressForNetwork(accountForRequest, requestNetwork.id, requestNetwork.coinType) || ''
            ).trim()
            if (!senderAddress) {
              throw new Error('No RTM address available for RTM issuer action')
            }
            const action = rtmIssuerAction
            if (!action) throw new Error('Missing RTM issuer action payload')
            if (senderAddress !== String(action.ownerAddress || '').trim()) {
              throw new Error('Issuer owner address does not match the selected wallet account')
            }
            return await executeRtmIssuerAction({
              action,
              rpcConfig: createRtmMarketRpcConfig(requestNetwork, signBackendAuthMessage)
            })
          })()
        : requestIsSignMessage
        ? await (async () => {
            const ecosystem = String(requestPayload?.ecosystem || '').trim().toLowerCase()
            if (requestIsRtmSignMessage || ecosystem === 'rtm' || String(requestNetwork?.id || '').trim() === 'rtm') {
              return await signRtmMessage({
                mnemonic,
                accountIndex,
                address: String(requestPayload?.address || '').trim() || undefined,
                message: String(requestPayload?.message || '')
              })
            }
            if (ecosystem === 'solana' || requestModelId === 'sol') {
              return await signSolanaMessage({
                mnemonic,
                accountIndex,
                messageBase64: String(requestPayload?.messageBase64 || '')
              })
            }
            return {
              signature: await signEvmMessage({
                mnemonic,
                accountIndex,
                message: String(requestPayload?.message || ''),
                encoding: String(requestPayload?.encoding || 'utf8').trim().toLowerCase() === 'hex' ? 'hex' : 'utf8'
              })
            }
          })()
        : requestIsRtmGetPublicKey
        ? await (async () => {
            const derived = await deriveUtxoAddress(mnemonic, 'RTM', accountIndex)
            return {
              networkId: 'rtm',
              accountId: accountForRequest?.id || pendingRequest.accountId,
              address: derived.address,
              pubkeyHex: derived.pubHex,
              status: 'completed'
            }
          })()
        : requestIsSignTypedData
        ? {
            signature: await signEvmTypedData({
              mnemonic,
              accountIndex,
              typedData: requestPayload?.typedData
            })
          }
        : requestIsSignTransaction
        ? await (async () => {
            const ecosystem = String(requestPayload?.ecosystem || '').trim().toLowerCase()
            if (ecosystem === 'solana' || requestModelId === 'sol') {
              return {
                signedTxBase64: await signSolanaTransaction({
                  mnemonic,
                  accountIndex,
                  serializedTxBase64: String(requestPayload?.serializedTxBase64 || '')
                })
              }
            }
            return {
              signedTransaction: await signEvmTransaction({
                mnemonic,
                accountIndex,
                tx: requestPayload?.tx || requestPayload || {}
              })
            }
          })()
        : requestIsSignAllTransactions
        ? {
            signedTxsBase64: await signSolanaTransactions({
              mnemonic,
              accountIndex,
              serializedTxsBase64: Array.isArray(requestPayload?.serializedTxsBase64)
                ? requestPayload.serializedTxsBase64.map((row: unknown) => String(row || ''))
                : []
            })
          }
        : requestIsSignAndSendTransaction
        ? await (async () => {
            const ecosystem = String(requestPayload?.ecosystem || '').trim().toLowerCase()
            if (ecosystem === 'evm') {
              return await signAndSendEvmTransaction({
                mnemonic,
                accountIndex,
                rpcConfig: {
                  networkId: String(requestNetwork?.id || ''),
                  coinSymbol: String(requestNetwork?.coinSymbol || requestNetwork?.symbol || ''),
                  rpcUrl: String(requestNetwork?.rpcUrl || ''),
                  rpcWallet: String(requestNetwork?.rpcWallet || ''),
                  rpcUsername: String(requestNetwork?.rpcUsername || ''),
                  rpcPassword: String(requestNetwork?.rpcPassword || ''),
                  bridgeUrl: String(requestNetwork?.bridgeUrl || ''),
                  bridgeUsername: String(requestNetwork?.bridgeUsername || ''),
                  bridgePassword: String(requestNetwork?.bridgePassword || '')
                },
                tx: requestPayload?.tx || requestPayload || {}
              })
            }
            return await signAndSendSolanaTransaction({
              mnemonic,
              accountIndex,
              rpcConfig: {
                networkId: String(requestNetwork?.id || ''),
                coinSymbol: String(requestNetwork?.coinSymbol || requestNetwork?.symbol || ''),
                rpcUrl: String(requestNetwork?.rpcUrl || ''),
                rpcWallet: String(requestNetwork?.rpcWallet || ''),
                rpcUsername: String(requestNetwork?.rpcUsername || ''),
                rpcPassword: String(requestNetwork?.rpcPassword || ''),
                bridgeUrl: String(requestNetwork?.bridgeUrl || ''),
                bridgeUsername: String(requestNetwork?.bridgeUsername || ''),
                bridgePassword: String(requestNetwork?.bridgePassword || '')
              },
              serializedTxBase64: String(requestPayload?.serializedTxBase64 || '')
            })
          })()
        : requestIsCosmosSignDirect
        ? await signCosmosDirect({
            mnemonic,
            accountIndex,
            network: requestNetwork,
            signDoc: requestPayload?.signDoc
          })
        : requestIsCosmosSignAmino
        ? await signCosmosAmino({
            mnemonic,
            accountIndex,
            network: requestNetwork,
            signDoc: requestPayload?.signDoc
          })
        : requestIsCosmosGetKey
        ? await deriveCosmosKeyData({
            mnemonic,
            accountIndex,
            network: requestNetwork
          })
        : requestIsCosmosSendTx
        ? await broadcastCosmosTx({
            rpcUrl: String(requestNetwork?.rpcUrl || ''),
            txBytesBase64: String(requestPayload?.txBytesBase64 || ''),
            mode:
              requestPayload?.mode === 'BROADCAST_MODE_SYNC'
              || requestPayload?.mode === 'BROADCAST_MODE_ASYNC'
              || requestPayload?.mode === 'BROADCAST_MODE_BLOCK'
                ? requestPayload.mode
                : undefined
          })
        : requestNetwork.coinType === 'EVM'
        ? await sendEvmTransaction({
            ...(requestIsEvmTx
              ? {
                  to: requestTo === 'Contract Creation' ? undefined : requestTo,
                  value: requestAmount,
                  data: requestData,
                  gasLimit: requestGasLimit || undefined,
                  gasPrice: requestGasPrice || undefined,
                  maxFeePerGas: requestMaxFeePerGas || undefined,
                  maxPriorityFeePerGas: requestMaxPriorityFeePerGas || undefined,
                  type: requestTxType
                }
              : {
                  to: requestTo,
                  amount: requestAmount
                })
          })
        : requestNetwork.coinType === 'XRP'
        ? await sendXrpTransaction({
            to: requestTo,
            amount: requestAmount
          })
        : requestModelId === 'ada'
        ? await sendCardanoTransaction({
            to: requestTo,
            amount: requestAmount
          })
        : requestModelId === 'xmr'
        ? await sendMoneroTransaction({
            to: requestTo,
            amount: requestAmount
          })
        : requestModelId === 'sol'
        ? await sendSolanaTransaction({
            to: requestTo,
            amount: requestAmount
          })
        : requestModelId === 'sui'
        ? await sendSuiTransaction({
            to: requestTo,
            amount: requestAmount
          })
        : requestModelId === 'xlm'
        ? await sendStellarTransaction({
            to: requestTo,
            amount: requestAmount
          })
        : requestModelId === 'tron'
        ? await sendTronTransaction({
            to: requestTo,
            amount: requestAmount
          })
        : isCosmosLikeModelId(requestModelId)
        ? await sendUtxoTransaction({
            to: requestTo,
            amount: requestAmount,
            memo: requestMemo
          })
        : await sendUtxoTransaction({
          to: requestTo,
          amount: requestAmount,
          memo: requestMemo
        })
      const txHash = String((tx as any)?.hash || (tx as any)?.txid || (tx as any)?.signature || (tx as any)?.txhash || (tx as any)?.pubkeyHex || '').trim()
      const safeTxHash = String((tx as any)?.safeTxHash || '').trim()
      const txIdentifier = txHash || safeTxHash

      if (txIdentifier && !isNonBroadcastRequestMethod(requestMethod) && !requestIsCosmosGetKey) {
        const latestState = useWalletStore.getState()
        const networkForActivity = latestState.networks.find((n) => n.id === pendingRequest.networkId) || latestState.networks[0]
        const accountForActivity = latestState.accounts.find((a) => a.id === pendingRequest.accountId) || latestState.accounts[0]
        const senderAddress = String(
          getAccountAddressForNetwork(accountForActivity, pendingRequest.networkId, networkForActivity?.coinType)
          || ''
        ).trim()

        if (networkForActivity) {
          addActivity({
            id: txIdentifier,
            type: 'sent',
            asset: (requestIsAssetSend || (requestIsRtmMarketAction && !!requestAssetId) || (requestIsRtmIssuerAction && !!requestAssetId)) ? requestAssetId : networkForActivity.symbol,
            assetId: (requestIsAssetSend || (requestIsRtmMarketAction && !!requestAssetId) || (requestIsRtmIssuerAction && !!requestAssetId))
              ? (requestAssetId || undefined)
              : (buildNativeActivityAssetId(networkForActivity.id) || undefined),
            amount: requestAmount || '0',
            from: senderAddress,
            to: requestIsEvmTx && requestTo === 'Contract Creation' ? undefined : requestTo || undefined,
            accountId: pendingRequest.accountId,
            status: 'pending',
            timestamp: Date.now(),
            networkId: networkForActivity.id
          })
          if (txHash) {
            trackActivityTransactionStatus({ txid: txHash, networkId: networkForActivity.id })
          }
        }
        await collectActiveNetworkData({ force: true, includeFiat: false })
      }

      await chrome.storage.local.set({
        [DAPP_PENDING_REQUEST_STORAGE_KEY]: {
          ...pendingRequest,
          status: 'executed',
          result: tx,
          updatedAt: Date.now()
        }
      })

      if (txIdentifier) {
        const resultState: TxResultState = {
          txid: txIdentifier,
          networkId: pendingRequest.networkId,
          accountId: pendingRequest.accountId,
          asset: isNonBroadcastRequestMethod(requestMethod)
            ? requestTypeLabel
            : ((requestIsAssetSend || (requestIsRtmMarketAction && !!requestAssetId)) ? (requestAssetId || 'ASSET') : (requestNetwork?.symbol || 'TX')),
          assetId: (requestIsAssetSend || (requestIsRtmMarketAction && !!requestAssetId))
            ? (requestAssetId || undefined)
            : (buildNativeActivityAssetId(pendingRequest.networkId) || undefined),
          amount: requestAmount || '0',
          from: requestIsEvmTx && requestTo === 'Contract Creation' ? undefined : undefined,
          to: requestIsEvmTx && requestTo === 'Contract Creation'
            ? undefined
            : (requestTo || String((tx as any)?.address || '').trim() || undefined),
          status: isNonBroadcastRequestMethod(requestMethod)
            ? String((tx as any)?.status || 'completed')
            : (txHash ? 'pending' : String((tx as any)?.status || 'pending')),
          origin: pendingRequest.origin,
          requestMethod: requestMethod
        }
        navigate('/tx/result', { replace: true, state: resultState })
        return
      }

      navigate('/wallet/assets')
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
    } finally {
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
      setIsSubmitting(false)
    }
  }

  const content = (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 flex items-center justify-between border-b border-dark-600">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dapp Request</span>
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
              <div className="flex justify-center">
                <span className="rounded-full border border-dark-600 bg-dark-800 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-200">
                  {requestAccountKindLabel}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-dark-600 bg-dark-700/50 space-y-3">
              <Row label="Network" value={requestNetwork?.name || pendingRequest.networkId} />
              <Row label="Runtime Model" value={String(requestNetwork?.runtimeModelId || requestNetwork?.id || 'unknown')} mono />
              <Row label="Method" value={requestMethod} mono />
              <Row label="Type" value={requestTypeLabel} />
              {requestIsAuthSignature ? (
                <Row
                  label="Signer"
                  value={String(requestPayload?.address || requestPayload?.signer || requestAccount?.networkAddresses?.[pendingRequest.networkId] || '') || 'Selected wallet account'}
                  mono
                />
              ) : null}
              {requestTo ? <Row label="To" value={requestTo} mono /> : null}
              {(requestIsAssetSend || (requestIsRtmMarketAction && !!requestAssetId) || (requestIsRtmIssuerAction && !!requestAssetId)) ? <Row label="Asset" value={requestAssetId} mono /> : null}
              {requestAmount ? (
                <Row
                  label={requestIsAuthSignature ? 'Message Size' : (requestIsEvmTx ? 'Value' : 'Amount')}
                  value={requestIsAuthSignature
                    ? requestAmount
                    : `${requestAmount} ${(requestIsAssetSend || (requestIsRtmMarketAction && !!requestAssetId) || requestIsRtmIssuerAction) ? '' : (requestNetwork?.symbol || '')}`.trim()}
                />
              ) : null}
              {requestIsRtmMarketAction && rtmGrossAmount ? <Row label="Gross Order Amount" value={`${rtmGrossAmount} ${requestNetwork?.symbol || ''}`.trim()} /> : null}
              {requestIsRtmMarketAction && rtmFeeBps > 0 ? <Row label="Fee Rate" value={formatBpsPercent(rtmFeeBps)} /> : null}
              {requestIsRtmMarketAction && rtmFeeAmount ? <Row label="Platform Fee" value={`${rtmFeeAmount} ${requestNetwork?.symbol || ''}`.trim()} /> : null}
              {requestIsRtmMarketAction && rtmFeeRecipient ? <Row label="Fee Recipient" value={rtmFeeRecipient} mono /> : null}
              {requestIsRtmMarketAction ? (
                <Row
                  label="Order Verification"
                  value={
                    rtmMarketVerificationLoading
                      ? 'Checking server order'
                      : rtmMarketVerificationError
                      ? `Failed: ${rtmMarketVerificationError}`
                      : rtmMarketOrder
                      ? 'Verified against server order'
                      : 'Pending'
                  }
                />
              ) : null}
              {requestIsRtmIssuerAction ? (
                <Row
                  label="Draft Verification"
                  value={
                    rtmIssuerVerificationLoading
                      ? 'Checking server draft'
                      : rtmIssuerVerificationError
                      ? `Failed: ${rtmIssuerVerificationError}`
                      : rtmIssuerDraft
                      ? 'Verified against server draft'
                      : 'Pending'
                  }
                />
              ) : null}
              {requestMemo ? <Row label="Memo" value={requestMemo} mono /> : null}
              {requestData ? <Row label="Data" value={requestData} mono /> : null}
              {requestPreview ? <Row label="Preview" value={requestPreview} mono /> : null}
              {requestGasLimit ? <Row label="Gas Limit" value={requestGasLimit} mono /> : null}
              {requestGasPrice ? <Row label="Gas Price" value={requestGasPrice} mono /> : null}
              {requestMaxFeePerGas ? <Row label="Max Fee" value={requestMaxFeePerGas} mono /> : null}
              {requestMaxPriorityFeePerGas ? <Row label="Priority Fee" value={requestMaxPriorityFeePerGas} mono /> : null}
              {requestTxType ? <Row label="Tx Type" value={String(requestTxType)} mono /> : null}
            </div>

            {requestAccountIsMultisig ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[11px] text-amber-100 leading-relaxed">
                {multisigUnsupportedReason}
              </div>
            ) : null}

            {submitError ? (
              <p className="text-xs text-red-400 break-words">{submitError}</p>
            ) : null}
            {!submitError && requestIsRtmMarketAction && rtmMarketVerificationError ? (
              <p className="text-xs text-red-400 break-words">{rtmMarketVerificationError}</p>
            ) : null}
            {!submitError && requestIsRtmIssuerAction && rtmIssuerVerificationError ? (
              <p className="text-xs text-red-400 break-words">{rtmIssuerVerificationError}</p>
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
          disabled={!pendingRequest || sendBlockedBySync || rtmMarketVerificationLoading || rtmIssuerVerificationLoading || (requestIsRtmMarketAction && !!rtmMarketVerificationError) || (requestIsRtmIssuerAction && !!rtmIssuerVerificationError) || (requestAccountIsMultisig && (requestIsSignMessage || requestIsSignTypedData || requestIsSignTransaction || requestIsSignAllTransactions || requestIsSignAndSendTransaction || requestIsRtmGetPublicKey || requestIsCosmosSignDirect || requestIsCosmosSignAmino))}
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
