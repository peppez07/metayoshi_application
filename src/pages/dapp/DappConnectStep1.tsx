import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoCheckmarkCircle } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { PasswordGate } from '../../components/PasswordGate'
import {
  DAPP_PENDING_APPROVAL_STORAGE_KEY,
  parseDappPendingApproval,
  type DappPendingApproval,
  type DappScope
} from '../../lib/dappPermissions'
import { useWalletStore } from '../../store/walletStore'
import { isSidePanel } from '../../lib/surface'

function canUseChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
}

function scopeLabel(scope: DappScope): string {
  if (scope === 'read') return 'See your selected RTM address'
  if (scope === 'sign') return 'Request message signatures (currently disabled)'
  if (scope === 'send_coin') return 'Request RTM transfers (wallet_sendTransaction)'
  return 'Request asset transfers (wallet_sendAsset)'
}

const DappConnectStep1: React.FC = () => {
  const navigate = useNavigate()
  const { accounts, activeAccountId, isLocked, setActiveAccount } = useWalletStore()
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingApproval, setPendingApproval] = useState<DappPendingApproval | null>(null)
  const [loadingApproval, setLoadingApproval] = useState(true)

  useEffect(() => {
    if (!selectedAccount) setSelectedAccount(activeAccountId || accounts[0]?.id || null)
  }, [accounts, activeAccountId, selectedAccount])

  useEffect(() => {
    if (!canUseChromeStorage()) {
      setLoadingApproval(false)
      return
    }
    let mounted = true
    const apply = (raw: unknown): void => {
      const parsed = parseDappPendingApproval(raw)
      if (!mounted) return
      setPendingApproval(parsed && parsed.status === 'pending' ? parsed : null)
      setLoadingApproval(false)
    }
    void chrome.storage.local.get(DAPP_PENDING_APPROVAL_STORAGE_KEY)
      .then((result) => apply(result[DAPP_PENDING_APPROVAL_STORAGE_KEY]))
      .catch(() => apply(null))
    const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string): void => {
      if (area === 'local' && changes[DAPP_PENDING_APPROVAL_STORAGE_KEY]) apply(changes[DAPP_PENDING_APPROVAL_STORAGE_KEY].newValue)
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => {
      mounted = false
      chrome.storage.onChanged.removeListener(onChanged)
    }
  }, [])

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return accounts
    return accounts.filter((a) => a.name.toLowerCase().includes(query) || a.address.toLowerCase().includes(query))
  }, [accounts, searchQuery])

  const next = (): void => {
    if (selectedAccount) setActiveAccount(selectedAccount)
    navigate('/dapp/connect/2')
  }

  const rejectAndClose = async (): Promise<void> => {
    if (canUseChromeStorage() && pendingApproval) {
      await chrome.storage.local.set({
        [DAPP_PENDING_APPROVAL_STORAGE_KEY]: { ...pendingApproval, status: 'rejected', updatedAt: Date.now() }
      })
    }
    navigate('/wallet/assets')
    if (!isSidePanel()) window.close()
  }

  if (loadingApproval) {
    return (
      <div className="flex flex-col h-full bg-dark-800 items-center justify-center text-xs text-gray-400">
        Loading approval request...
      </div>
    )
  }

  if (!pendingApproval) {
    return (
      <div className="flex flex-col h-full bg-dark-800">
        <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-gray-400">
          No pending dapp approval request.
        </div>
        <footer className="p-4 border-t border-dark-600">
          <Button className="w-full btn-primary" onClick={() => navigate('/wallet/assets')}>Back to wallet</Button>
        </footer>
      </div>
    )
  }

  const content = (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 flex items-center justify-between border-b border-dark-600">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Connecting Wallet with Dapp</span>
        <span className="text-xs font-bold text-primary">1 of 2</span>
      </header>

      <div className="flex-1 min-h-0 p-6 space-y-6 overflow-y-auto custom-scrollbar">
        <div className="text-center space-y-1 py-2">
          <h2 className="text-lg font-bold">Connect With MetaYoshi</h2>
          <p className="text-xs text-gray-400 break-all">{pendingApproval.origin}</p>
        </div>

        <div className="space-y-4">
          <div className="p-3 rounded-xl border border-dark-600 bg-dark-700/40">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Requested scopes</p>
            <div className="space-y-1">
              {pendingApproval.scopes.map((scope) => (
                <p key={scope} className="text-[11px] text-gray-300">{scopeLabel(scope)}</p>
              ))}
            </div>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase">Select the account to share with this site</p>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search account or address"
            className="w-full h-10 rounded-lg border border-dark-600 bg-dark-700/60 px-3 text-xs text-white placeholder:text-gray-500 outline-none focus:border-primary"
          />
          <div className="space-y-2">
            {filteredAccounts.map((account) => (
              <div
                key={account.id}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedAccount === account.id ? 'border-primary bg-primary/5' : 'border-dark-600 bg-dark-700/50 hover:bg-dark-700'
                }`}
                onClick={() => setSelectedAccount(account.id)}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{account.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{account.address ? `${account.address.slice(0, 14)}…` : 'No address'}</span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedAccount === account.id ? 'bg-primary border-primary' : 'border-dark-600'
                }`}>
                  {selectedAccount === account.id && <IoCheckmarkCircle className="text-white w-4 h-4" />}
                </div>
              </div>
            ))}
            {filteredAccounts.length === 0 && (
              <div className="p-4 rounded-xl border border-dark-600 bg-dark-700/30 text-xs text-center text-gray-400">
                No accounts match this search.
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="p-4 border-t border-dark-600 flex gap-4">
        <Button variant="outline" className="flex-1" onClick={() => { void rejectAndClose() }}>Cancel</Button>
        <Button className="flex-1 btn-primary" onClick={next} disabled={!selectedAccount}>Next</Button>
      </footer>
    </div>
  )

  if (isLocked) {
    return (
      <PasswordGate title="Unlock to connect dApp" description="Enter your wallet password to review and approve this dApp connection.">
        {content}
      </PasswordGate>
    )
  }

  return content
}

export default DappConnectStep1
