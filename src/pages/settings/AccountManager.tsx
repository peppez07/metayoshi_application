import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useWalletStore } from '../../store/walletStore'
import { IoAdd, IoTrashOutline, IoCheckmarkCircle } from 'react-icons/io5'
import { useToast } from '../../components/Toast'

const AccountManager: React.FC = () => {
  const {
    accounts,
    activeAccountId,
    activeNetworkId,
    networks,
    setActiveAccount,
    addAccount,
    removeAccount
  } = useWalletStore()
  const [showAdd, setShowAdd] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const { showToast } = useToast()
  const navigate = useNavigate()
  const activeNetwork = networks.find((n) => n.id === activeNetworkId) || networks[0]

  const handleAddAccount = async () => {
    setError('')
    
    if (!accountName.trim()) {
      setError('Account name is required')
      return
    }

    if (accounts.some(a => a.name.toLowerCase() === accountName.toLowerCase())) {
      setError('Account with this name already exists')
      return
    }

    setIsCreating(true)
    try {
      await addAccount(accountName.trim(), activeNetworkId)
      showToast(`${activeNetwork?.symbol || 'Network'} account created successfully`, 'success')
      setAccountName('')
      setShowAdd(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleRemove = (id: string) => {
    if (accounts.length <= 1) {
      showToast('Cannot remove the last account', 'error')
      return
    }
    removeAccount(id)
    showToast('Account removed', 'success')
  }

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 bg-dark-900 border-b border-dark-600 text-center flex items-center justify-between">
        <button 
          onClick={() => navigate('/settings')}
          className="w-8"
        />
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-200">Account Manager</h2>
        <button 
          onClick={() => {
            setShowAdd(!showAdd)
            setError('')
          }}
          className="w-8 h-8 flex items-center justify-center text-primary hover:bg-dark-700 rounded-full transition-colors"
        >
          <IoAdd className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {showAdd ? (
          <div className="p-6 space-y-6">
            <h3 className="text-sm font-bold text-gray-200">Create New Account</h3>
            <div className="space-y-4">
              <Input 
                label="Account Name" 
                placeholder="Account 2" 
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}
            <div className="flex gap-4 pt-4">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => {
                  setShowAdd(false)
                  setError('')
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => void handleAddAccount()} isLoading={isCreating}>Create</Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-dark-600">
            {accounts.map((account) => (
              <div 
                key={account.id} 
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-dark-700 transition-colors ${
                  activeAccountId === account.id ? 'bg-primary/5' : ''
                }`}
                onClick={() => setActiveAccount(account.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-yellow-500 flex-shrink-0" />
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-200">{account.name}</span>
                      {activeAccountId === account.id && <IoCheckmarkCircle className="text-primary w-4 h-4 flex-shrink-0" />}
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono truncate">
                      {(() => {
                        const addr =
                          account.networkAddresses?.[activeNetworkId]
                          || (activeNetwork?.coinType === 'EVM' ? account.addresses.EVM : account.addresses.UTXO)
                          || ''
                        return addr ? `${addr.slice(0, 10)}...${addr.slice(-8)}` : 'No address on this coin yet'
                      })()}
                    </span>
                  </div>
                </div>
                {accounts.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(account.id)
                    }}
                    className="p-2 text-gray-500 hover:text-red-500 transition-colors ml-2"
                  >
                    <IoTrashOutline className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AccountManager
