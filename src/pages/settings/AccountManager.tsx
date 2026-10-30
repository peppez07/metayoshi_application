import React, { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { activeAccountOf, useWalletStore } from '../../store/walletStore'
import { IoAdd, IoTrashOutline, IoCheckmarkCircle } from 'react-icons/io5'
import { useToast } from '../../components/Toast'
import { IconButton, Notice } from '../../components/ui'
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
    <div className="px-4 py-4 space-y-4">
      {showAdd ? (
        <div className="card px-4 py-4 space-y-4">
          <h3 className="text-sm font-semibold">New account</h3>
          <Input label="Account name" placeholder={`Account ${accounts.length + 1}`} value={accountName} onChange={(e) => setAccountName(e.target.value)} autoFocus />
          <p className="text-[11px] text-gray-500">The next address is derived from your recovery phrase (m/44'/175'/n'/0/0), so it can always be restored.</p>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowAdd(false); setError('') }} disabled={isCreating}>Cancel</Button>
            <Button className="flex-1" onClick={() => void handleAddAccount()} isLoading={isCreating}>Create</Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => { setShowAdd(true); setError('') }}>
          <IoAdd className="w-4 h-4" /> Add account
        </Button>
      )}

      {activeAccount && !showAdd && (
        <div className="card px-4 py-4 space-y-3">
          <Input label="Active account name" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          <Button variant="secondary" className="w-full" onClick={handleRename} disabled={!renameValue.trim() || renameValue.trim() === activeAccount.name}>Save name</Button>
        </div>
      )}

      <div className="card p-1.5">
        {accounts.map((account) => {
          const active = activeAccountId === account.id
          return (
            <div key={account.id} className="flex items-center">
              <button type="button" className="list-row flex-1 min-w-0" onClick={() => setActiveAccount(account.id)} aria-pressed={active}>
                <span className="w-9 h-9 rounded-full shrink-0" style={{ background: SESSION_GRADIENT }} />
                <span className="flex flex-col min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {account.name}
                    {active && <IoCheckmarkCircle className="text-primary w-4 h-4 shrink-0" />}
                  </span>
                  <span className="text-[11px] text-gray-500 font-mono truncate">
                    {account.address ? `${account.address.slice(0, 10)}…${account.address.slice(-8)}` : 'Unlock to derive'}
                  </span>
                </span>
              </button>
              {accounts.length > 1 && (
                <IconButton label={`Remove ${account.name}`} onClick={() => handleRemove(account.id)} className="hover:text-danger mr-1">
                  <IoTrashOutline className="w-4 h-4" />
                </IconButton>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AccountManager