import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useWalletStore } from '../../store/walletStore'
import { IoArrowBack } from 'react-icons/io5'
import { resolveNetworkCapabilities } from '../../lib/networkCapabilities'
import { getSendBlockedSyncReason, isSendBlockedBySync } from '../../lib/sendSyncPolicy'

const Send: React.FC = () => {
  const navigate = useNavigate()
  const { accounts, activeAccountId, networks, activeNetworkId, isSyncing, syncPercent, isConnected } = useWalletStore()
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0]
  const activeNetwork = networks.find(n => n.id === activeNetworkId) || networks[0]
  const caps = resolveNetworkCapabilities(activeNetwork)
  const sendBlockedBySync = isSendBlockedBySync(isSyncing, syncPercent, isConnected)
  const syncBlockedReason = getSendBlockedSyncReason(isSyncing, syncPercent, isConnected)

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!caps.features.nativeSend) {
      setError(`${activeNetwork.name} does not support native coin transfers in this wallet`)
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

    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    if (parseFloat(amount) > parseFloat(activeAccount?.balance || '0')) {
      setError('Insufficient balance')
      return
    }

    // Resolve the correct per-network address (never use the generic UTXO slot
    // which holds the first-derived coin address, not necessarily this network's)
    const fromAddress = activeNetwork.coinType === 'EVM'
      ? (activeAccount?.addresses.EVM || '')
      : (activeAccount?.networkAddresses?.[activeNetwork.id] || '')
    
    navigate('/tx/confirm', { 
      state: { 
        to: toAddress,
        amount: amount,
        from: fromAddress
      } 
    })
  }

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 border-b border-dark-600 flex items-center gap-3">
        <button 
          onClick={() => navigate('/wallet/assets')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <IoArrowBack className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-gray-200">Send {activeNetwork.symbol}</h1>
      </header>

      <form onSubmit={handleSend} className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto custom-scrollbar">
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-dark-600 bg-dark-700/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-yellow-500" />
                <span className="text-xs font-bold">{activeAccount?.name || 'Account 1'}</span>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-dark-600 border border-dark-600 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                <span className="text-[9px] font-bold text-gray-300 uppercase">{activeNetwork.name}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500 font-bold uppercase">Available Balance</p>
              <p className="text-lg font-bold">{activeAccount?.balance || 0} {activeNetwork.symbol}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
              Recipient Address
            </label>
            <Input
              placeholder={`Enter ${activeNetwork.name} address`}
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              className="bg-dark-700/50 border-dark-600 font-mono text-xs"
            />
          </div>

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
                onChange={(e) => setAmount(e.target.value)}
                className="bg-dark-700/50 border-dark-600 pr-16"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <span className="text-xs font-bold text-gray-400 uppercase">{activeNetwork.symbol}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {[0.25, 0.5, 0.75, 1].map((percent) => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => {
                    const balance = parseFloat(activeAccount?.balance || '0')
                    setAmount((balance * percent).toFixed(8))
                  }}
                  className="flex-1 px-3 py-1.5 bg-dark-700 rounded-lg text-xs font-bold text-gray-300 hover:bg-dark-600 transition-colors"
                >
                  {percent * 100}%
                </button>
              ))}
            </div>
          </div>
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
          <Button 
            type="submit"
            className="w-full btn-primary"
          >
            Continue
          </Button>
        </div>
      </form>
    </div>
  )
}

export default Send
