import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../Button'
import { Input } from '../Input'
import { formatFiatValue, useWalletStore, type SendableItem } from '../../store/walletStore'
import { resolveNetworkCapabilities } from '../../lib/networkCapabilities'
import { getSendBlockedSyncReason, isSendBlockedBySync } from '../../lib/sendSyncPolicy'
import { IoArrowBackOutline, IoInformationCircleOutline } from 'react-icons/io5'
import { getAccountDisplayName } from '../../lib/accountName'
import { fetchCoinDonationPolicy, supportsCoinDonationPolicy } from '../../coins/donationPolicy'

function formatUnits8(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  return value.toFixed(8).replace(/\.?0+$/, '')
}

function estimateNativeSendFee(network: { coinType: string; feePerByte?: number }): number {
  const modelId = String((network as any)?.runtimeModelId || (network as any)?.id || '').trim().toLowerCase()
  if (modelId === 'cosmos' || modelId === 'cro' || modelId === 'crocosmos') return 0.0025
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

type NftQuantityMode = 'not-nft' | 'erc721-fixed' | 'erc1155-integer' | 'nft-fixed'

function resolveNftQuantityMode(item: SendableItem): NftQuantityMode {
  if (item.kind !== 'nft') return 'not-nft'
  const assetId = String(item.assetId || '').trim()
  const m = assetId.match(/^EVMNFT:(erc721|erc1155):0x[a-fA-F0-9]{40}:.+$/)
  if (!m) return 'nft-fixed'
  if (m[1] === 'erc721') return 'erc721-fixed'
  return 'erc1155-integer'
}

type SendTransferFormProps = {
  item: SendableItem
  onBack: () => void
}

const SendTransferForm: React.FC<SendTransferFormProps> = ({ item, onBack }) => {
  const navigate = useNavigate()
  const {
    accounts,
    activeAccountId,
    networks,
    activeNetworkId,
    donationPercent,
    fetchNetworkAssets,
    fetchNetworkFiat,
    accountNetworkFiatNative,
    accountNetworkFiatAssets,
    isConnected,
    isSyncing,
    syncPercent,
    lowSyncStreak
  } = useWalletStore()

  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0]
  const activeNetwork = networks.find((n) => n.id === activeNetworkId) || networks[0]
  const caps = resolveNetworkCapabilities(activeNetwork)
  const sendBlockedBySync = isSendBlockedBySync(isSyncing, syncPercent, isConnected, lowSyncStreak)
  const syncBlockedReason = getSendBlockedSyncReason(isSyncing, syncPercent, isConnected, lowSyncStreak)
  const nftMode = resolveNftQuantityMode(item)
  const isNative = item.requestType === 'native'
  const isIntegerMode = nftMode === 'erc1155-integer'
  const isFixedOneMode = nftMode === 'erc721-fixed' || nftMode === 'nft-fixed'
  const available = Number(item.rawAmount || 0) / 1e8
  const estimatedNativeFee = useMemo(() => estimateNativeSendFee(activeNetwork), [activeNetwork])
  const fiatScopeKey = `${String(activeAccount?.id || '').trim().toLowerCase()}::${String(activeNetworkId || '').trim().toLowerCase()}`
  const availableFiatValue = isNative
    ? accountNetworkFiatNative?.[fiatScopeKey]?.usd
    : accountNetworkFiatAssets?.[fiatScopeKey]?.[String(item.assetId || '').trim()]?.usd
  const displayAvailableFiat = formatFiatValue(availableFiatValue)

  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setToAddress('')
    setError('')
    setAmount(isFixedOneMode ? '1' : '')
  }, [item.id, isFixedOneMode])

  useEffect(() => {
    let cancelled = false
    const hydrateFiat = async () => {
      if (cancelled) return
      if (item.requestType === 'asset') {
        await fetchNetworkAssets().catch(() => {})
      }
      if (cancelled) return
      await fetchNetworkFiat({ force: item.requestType === 'asset' }).catch(() => {})
    }
    void hydrateFiat()
    return () => { cancelled = true }
  }, [item.id, item.requestType, fetchNetworkAssets, fetchNetworkFiat])

  const validateAmount = (): string | null => {
    if (isFixedOneMode) {
      if (available < 1) {
        setError('This NFT is not currently spendable on this address')
        return null
      }
      return '1'
    }

    const raw = String(amount || '').trim()
    if (!raw) {
      setError(isNative ? 'Amount must be greater than 0' : 'Quantity must be greater than 0')
      return null
    }

    if (isIntegerMode) {
      if (!/^\d+$/.test(raw)) {
        setError('ERC1155 quantity must be a whole number')
        return null
      }
      const qty = BigInt(raw)
      if (qty <= 0n) {
        setError('Quantity must be greater than 0')
        return null
      }
      const availableInt = BigInt(Math.max(0, Math.floor(available)))
      if (qty > availableInt) {
        setError('Insufficient asset balance')
        return null
      }
      return qty.toString()
    }

    const numeric = Number(raw)
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError(isNative ? 'Amount must be greater than 0' : 'Quantity must be greater than 0')
      return null
    }
    if (numeric > available) {
      setError(isNative ? 'Insufficient balance' : 'Insufficient asset balance')
      return null
    }
    return formatUnits8(numeric)
  }

  const handleSetPercent = (pct: number) => {
    if (isFixedOneMode) return
    if (isIntegerMode) {
      const target = Math.max(1, Math.floor(available * pct))
      setAmount(String(target))
      return
    }
    setAmount(formatUnits8(available * pct))
  }

  const handleMax = () => {
    if (isFixedOneMode) {
      setAmount('1')
      return
    }
    if (isIntegerMode) {
      setAmount(String(Math.max(0, Math.floor(available))))
      return
    }
    setAmount(formatUnits8(available))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isNative && !caps.features.nativeSend) {
      setError(`${activeNetwork.name} does not support native coin transfers in this wallet`)
      return
    }
    if (!isNative && !caps.features.assetSend) {
      setError(`${activeNetwork.name} does not support token asset sends yet.`)
      return
    }
    if (sendBlockedBySync) {
      setError(syncBlockedReason)
      return
    }
    if (!toAddress.trim()) {
      setError('Recipient address is required')
      return
    }

    const normalizedAmount = validateAmount()
    if (!normalizedAmount) return

    const fromAddress = activeAccount?.networkAddresses?.[activeNetworkId]
      || (activeNetwork.coinType === 'EVM' ? activeAccount?.addresses?.EVM : '')
      || ''

    if (isNative) {
      const txState: Record<string, unknown> = {
        requestType: 'native',
        to: toAddress.trim(),
        amount: normalizedAmount,
        from: fromAddress
      }

      // Keep donation support active for supported UTXO coins while still
      // honoring user percentage when server policy is optional.
      if (activeNetwork.coinType === 'UTXO' && supportsCoinDonationPolicy(activeNetwork)) {
        try {
          const policy = await fetchCoinDonationPolicy(activeNetwork)
          if (policy?.enabled && policy.address && policy.percent > 0) {
            const baseAmount = Number(normalizedAmount)
            const spend = Number.isFinite(baseAmount) && baseAmount > 0 ? baseAmount : 0
            if (spend > 0) {
              const userPct = Number(donationPercent)
              const effectivePercent = policy.required
                ? Number(policy.percent)
                : (Number.isFinite(userPct) && userPct > 0 ? userPct : Number(policy.percent))
              if (effectivePercent > 0) {
                const donationAmount = (spend * effectivePercent) / 100
                txState.donationEnabled = true
                txState.donationPercent = Number(effectivePercent.toFixed(4))
                txState.donationMode = 'add'
                txState.donationAmount = formatUnits8(donationAmount)
                txState.donationAddress = policy.address
                txState.donationRequired = policy.required === true
                txState.enteredAmount = formatUnits8(spend)
                txState.totalBeforeNetworkFee = formatUnits8(spend + donationAmount)
              }
            }
          }
        } catch (err) {
          console.warn('[donation] policy fetch failed, continuing without donation payload:', err)
        }
      }

      navigate('/tx/confirm', { state: txState })
      return
    }

    const assetId = String(item.assetId || '').trim()
    if (!assetId) {
      setError('Asset id missing from selected send item')
      return
    }

    navigate('/tx/confirm', {
      state: {
        requestType: 'asset',
        assetId,
        assetLabel: item.label || assetId,
        to: toAddress.trim(),
        amount: normalizedAmount,
        from: fromAddress
      }
    })
  }

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 border-b border-dark-600 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          <IoArrowBackOutline className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-gray-200 truncate">
          Send {item.kind === 'native' ? activeNetwork.symbol : item.label}
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6 space-y-5 overflow-y-auto custom-scrollbar">
        <div className="p-4 rounded-xl border border-dark-600 bg-dark-700/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold">{getAccountDisplayName(activeAccount, activeNetworkId, 'Account 1')}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">{activeNetwork.symbol}</span>
          </div>
          <p className="text-[10px] text-gray-500 font-bold uppercase">Available</p>
          <p className="text-lg font-bold">
            {formatUnits8(available)} {item.kind === 'native' ? activeNetwork.symbol : item.symbol}
          </p>
          {displayAvailableFiat && (
            <p className="text-[11px] text-gray-400 mt-1">{displayAvailableFiat}</p>
          )}
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
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
            {isNative ? 'Amount' : 'Quantity'}
          </label>
          <div className="relative">
            <Input
              type="number"
              step={isIntegerMode || isFixedOneMode ? '1' : '0.00000001'}
              min={isIntegerMode || isFixedOneMode ? '1' : '0'}
              value={isFixedOneMode ? '1' : amount}
              onChange={(e) => {
                if (isFixedOneMode) return
                setAmount(e.target.value)
              }}
              className="bg-dark-700/50 border-dark-600 pr-20"
              disabled={isFixedOneMode}
            />
            <button
              type="button"
              onClick={handleMax}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-bold rounded bg-primary/20 text-primary border border-primary/30"
            >
              MAX
            </button>
          </div>
          {!isFixedOneMode && (
            <div className="flex gap-2 mt-1">
              {[0.25, 0.5, 0.75, 1].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleSetPercent(pct)}
                  className="flex-1 px-3 py-1.5 bg-dark-700 rounded-lg text-xs font-bold text-gray-300 hover:bg-dark-600 transition-colors"
                >
                  {pct * 100}%
                </button>
              ))}
            </div>
          )}
          {isFixedOneMode && (
            <p className="text-[10px] text-gray-500 ml-1">This NFT type is sent as a fixed quantity of 1.</p>
          )}
          {isIntegerMode && (
            <p className="text-[10px] text-gray-500 ml-1">ERC1155 sends require a whole-number quantity.</p>
          )}
        </div>

        <div className="flex gap-2.5 p-3 bg-dark-700/20 rounded-xl border border-dark-600/60">
          <IoInformationCircleOutline className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-600 leading-relaxed">
            {isNative
              ? `Estimated required fee: ~${formatUnits8(estimatedNativeFee)} ${activeNetwork.symbol}.`
              : `Asset transfer fee is paid in native ${activeNetwork.symbol}. Keep native balance for fees.`}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl">
            <p className="text-xs font-bold text-red-300 text-center">{error}</p>
          </div>
        )}
        {!error && sendBlockedBySync && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
            <p className="text-xs font-bold text-yellow-200 text-center">{syncBlockedReason}</p>
          </div>
        )}

        <div className="mt-auto pt-4">
          <Button type="submit" className="w-full btn-primary">
            Continue
          </Button>
        </div>
      </form>
    </div>
  )
}

export default SendTransferForm
