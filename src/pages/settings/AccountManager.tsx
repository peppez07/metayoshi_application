import React, { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { activeAccountOf, useWalletStore } from '../../store/walletStore'
import { IoAdd, IoTrashOutline, IoCheckmarkCircle } from 'react-icons/io5'
import { useToast } from '../../components/Toast'
import { SESSION_GRADIENT } from '../../lib/sessionColor'

const AccountManager: React.FC = () => {
  const state = useWalletStore()
  const { accounts, activeAccountId, setActiveAccount, addAccount, removeAccount, renameAccount } = state
  const activeAccount = activeAccountOf(state)
  const [showAdd, setShowAdd] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    setRenameValue(activeAccount?.name ?? '')
  }, [activeAccount?.id, activeAccount?.name])

  const nameTaken = (name: string, exceptId?: string) =>
    accounts.some((a) => a.id !== exceptId && a.name.toLowerCase() === name.trim().toLowerCase())

  const handleAddAccount = async () => {
    setError('')
    if (accountName.trim() && nameTaken(accountName)) {
      setError('An account with this name already exists')
      return
    }
    setIsCreating(true)
    try {
      const account = await addAccount(accountName)
      setActiveAccount(account.id)
      showToast('Account created', 'success')
      setAccountName('')
      setShowAdd(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsCreating(false)
    }
  }

  const handleRename = () => {
    if (!activeAccount) return
    const next = renameValue.trim()
    if (!next) return showToast('Account name is required', 'error')
    if (nameTaken(next, activeAccount.id)) return showToast('Another account already uses this name', 'error')
    renameAccount(activeAccount.id, next)
    showToast('Account renamed', 'success')
  }

  const handleRemove = (id: string) => {
    if (accounts.length <= 1) return showToast('Cannot remove the last account', 'error')
    if (!window.confirm('Remove this account from the list? Funds stay on chain and the account can be re-added later, since it is derived from your recovery phrase.')) return
    removeAccount(id)
    showToast('Account removed', 'success')
  }

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 bg-dark-900 border-b border-dark-600 text-center flex items-center justify-between">
        <span className="w-8" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-200">Account Manager</h2>
        <button
          onClick={() => { setShowAdd(!showAdd); setError('') }}
          className="w-8 h-8 flex items-center justify-center text-primary hover:bg-dark-700 rounded-full transition-colors"
        >
          <IoAdd className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {showAdd ? (
          <div className="p-6 space-y-6">
            <h3 className="text-sm font-bold text-gray-200">Create New Account</h3>
            <Input label="Account Name" placeholder={`Account ${accounts.length + 1}`} value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            <p className="text-[10px] text-gray-500">The next address is derived from your recovery phrase (m/44'/175'/n'/0/0).</p>
            {error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}
            <div className="flex gap-4 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => { setShowAdd(false); setError('') }} disabled={isCreating}>Cancel</Button>
              <Button className="flex-1" onClick={() => void handleAddAccount()} isLoading={isCreating}>Create</Button>
            </div>
          </div>
        ) : (
          <>
            {activeAccount && (
              <div className="p-4 border-b border-dark-600 bg-dark-900/30 space-y-3">
                <Input label="Active account name" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
                <Button className="w-full" onClick={handleRename} disabled={renameValue.trim() === activeAccount.name}>Save name</Button>
              </div>
            )}
            <div className="divide-y divide-dark-600">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-dark-700 transition-colors ${activeAccountId === account.id ? 'bg-primary/5' : ''}`}
                  onClick={() => setActiveAccount(account.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: SESSION_GRADIENT }} />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-200">{account.name}</span>
                        {activeAccountId === account.id && <IoCheckmarkCircle className="text-primary w-4 h-4 flex-shrink-0" />}
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono truncate">
                        {account.address ? `${account.address.slice(0, 10)}…${account.address.slice(-8)}` : 'Unlock to derive'}
                      </span>
                    </div>
                  </div>
                  {accounts.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(account.id) }}
                      className="p-2 text-gray-500 hover:text-red-500 transition-colors ml-2"
                    >
                      <IoTrashOutline className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AccountManager
