import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { AssetAvatar, Notice, PageHeader } from '../../components/ui'
import { decodeAddress } from '../../lib/rtm/address'
import { activeAccountOf, assetLabel, formatAsset, parseAssetQuantity, useWalletStore } from '../../store/walletStore'

const AssetSendPage: React.FC = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const assetId = String(params.get('id') || '')
  const state = useWalletStore()
  const info = state.assetInfo[assetId]
  const account = activeAccountOf(state)
  const holding = account ? (state.assets[account.id] ?? []).find((h) => h.assetId === assetId) : undefined
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState(info?.isUnique ? '1' : '')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!info) {
      setError('Asset metadata is not loaded yet')
      return
    }
    const destination = decodeAddress(to)
    if (!destination) {
      setError('Enter a valid Raptoreum address')
      return
    }
    if (destination.kind !== 'p2pkh') {
      setError('Assets can only be sent to standard R… addresses')
      return
    }
    try {
      const qty = parseAssetQuantity(amount.trim(), info)
      if (qty <= 0n) throw new Error('Quantity must be greater than zero')
      if (holding && qty > BigInt(holding.confirmed)) throw new Error('Quantity exceeds your confirmed balance')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return
    }
    navigate('/tx/confirm', { state: { kind: 'asset', assetId, to: to.trim(), amount: amount.trim() } })
  }

  const setMax = () => {
    if (!holding || !info) return
    setAmount(formatAsset(holding.confirmed, info))
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={`Send ${assetLabel(assetId, info)}`} />
      <form onSubmit={submit} className="flex-1 flex flex-col px-4 py-4 gap-4" noValidate>
        <div className="card-flat flex items-center gap-3 px-4 py-3">
          <AssetAvatar id={assetId || '0'} name={assetLabel(assetId, info)} size={32} unique={info?.isUnique} />
          <span className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold truncate">{assetLabel(assetId, info)}</span>
            <span className="text-[11px] text-gray-500">{account?.name}</span>
          </span>
          <span className="text-xs font-semibold tabular-nums">{formatAsset(holding?.confirmed ?? '0', info)} available</span>
        </div>

        <Input label="Recipient address" placeholder="R…" value={to} onChange={(e) => setTo(e.target.value)} className="font-mono text-xs" autoComplete="off" spellCheck={false} autoFocus />

        <div>
          <Input
            label={info?.isUnique ? 'Number of tokens' : 'Quantity'}
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            trailing={holding && info ? (
              <button type="button" onClick={setMax} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-primary/15 text-primary-300 hover:bg-primary/25">MAX</button>
            ) : undefined}
          />
          <p className="text-[11px] text-gray-500 mt-1.5 ml-1">
            {info?.isUnique
              ? 'Unique tokens are sent lowest ID first. The network fee is paid in RTM.'
              : `Up to ${info?.decimalPoint ?? 0} decimal places. The network fee is paid in RTM.`}
          </p>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <Button type="submit" size="lg" className="w-full mt-auto" disabled={!to.trim() || !amount.trim()}>
          Review
        </Button>
      </form>
    </div>
  )
}

export default AssetSendPage