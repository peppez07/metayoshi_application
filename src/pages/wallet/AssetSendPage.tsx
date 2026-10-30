import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IoArrowBack } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
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

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 flex items-center gap-3 border-b border-dark-600">
        <button onClick={() => navigate(-1)} className="p-1 rounded-lg hover:bg-dark-700">
          <IoArrowBack className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold truncate">Send {assetLabel(assetId, info)}</span>
      </header>

      <form onSubmit={submit} className="flex-1 flex flex-col p-6 gap-4">
        <div className="p-3 rounded-xl border border-dark-600 bg-dark-700/30 flex items-center justify-between">
          <span className="text-xs font-bold">{account?.name}</span>
          <span className="text-[10px] font-bold text-gray-300">{formatAsset(holding?.confirmed ?? '0', info)} available</span>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Recipient Address</label>
          <Input placeholder="R…" value={to} onChange={(e) => setTo(e.target.value)} className="bg-dark-700/50 border-dark-600 font-mono text-xs" autoFocus />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
            {info?.isUnique ? 'Number of tokens' : 'Quantity'}
          </label>
          <Input inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-dark-700/50 border-dark-600" />
          <p className="text-[10px] text-gray-500 ml-1">
            {info?.isUnique
              ? 'Unique tokens are sent lowest ID first.'
              : `Up to ${info?.decimalPoint ?? 0} decimal places. The network fee is paid in RTM.`}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-xs font-bold text-red-300 text-center">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full mt-auto" disabled={!to.trim() || !amount.trim()}>
          Review
        </Button>
      </form>
    </div>
  )
}

export default AssetSendPage
