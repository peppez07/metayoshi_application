import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoCheckmarkCircle } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { PasswordGate } from '../../components/PasswordGate'
import {
  DAPP_PENDING_APPROVAL_STORAGE_KEY,
  parseDappPendingApproval,
  type DappPendingApproval
} from '../../lib/dappPermissions'
import { useWalletStore } from '../../store/walletStore'
import { getAccountDisplayName } from '../../lib/accountName'

function canUseChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
}

const DappConnectStep1: React.FC = () => {
  const navigate = useNavigate()
  const { accounts, activeAccountId, activeNetworkId, isLocked, networks } = useWalletStore()
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [coinFilter, setCoinFilter] = useState('all')
  const [pendingApproval, setPendingApproval] = useState<DappPendingApproval | null>(null)
  const [loadingApproval, setLoadingApproval] = useState(true)

  useEffect(() => {
    const defaultAccountId = activeAccountId || accounts[0]?.id
    if (!defaultAccountId) return
    setSelectedAccounts((current) => {
      if (current.length > 0) return current
      return [defaultAccountId]
    })
  }, [accounts, activeAccountId])

  useEffect(() => {
    if (!canUseChromeStorage()) {
      setLoadingApproval(false)
      return
    }

    let mounted = true

    const applyPendingValue = (rawValue: unknown): void => {
      const parsed = parseDappPendingApproval(rawValue)
      if (!mounted) return
      setPendingApproval(parsed && parsed.status === 'pending' ? parsed : null)
      setLoadingApproval(false)
    }

    void chrome.storage.local
      .get(DAPP_PENDING_APPROVAL_STORAGE_KEY)
      .then((result) => {
        applyPendingValue(result[DAPP_PENDING_APPROVAL_STORAGE_KEY])
      })
      .catch(() => {
        if (!mounted) return
        setPendingApproval(null)
        setLoadingApproval(false)
      })

    const onStorageChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ): void => {
      if (areaName !== 'local' || !changes[DAPP_PENDING_APPROVAL_STORAGE_KEY]) return
      applyPendingValue(changes[DAPP_PENDING_APPROVAL_STORAGE_KEY].newValue)
    }

    chrome.storage.onChanged.addListener(onStorageChanged)
    return () => {
      mounted = false
      chrome.storage.onChanged.removeListener(onStorageChanged)
    }
  }, [])

  const toggleAccount = (id: string): void => {
    setSelectedAccounts((prev) => (
      prev.includes(id) ? prev.filter((candidate) => candidate !== id) : [...prev, id]
    ))
  }

  const coinOptions = useMemo(
    () => networks.map((network) => ({
      id: network.id,
      label: `${network.symbol} (${network.name})`
    })),
    [networks]
  )

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return accounts.filter((account) => {
      const filteredCoinAddress = coinFilter === 'all' ? '' : String(account.networkAddresses[coinFilter] || '').trim()
      const displayNameNetworkId = coinFilter === 'all' ? activeNetworkId : coinFilter
      const displayName = getAccountDisplayName(account, displayNameNetworkId, account.name)
      if (coinFilter !== 'all' && !filteredCoinAddress) return false

      if (!normalizedQuery) return true

      if (displayName.toLowerCase().includes(normalizedQuery)) return true
      if (account.name.toLowerCase().includes(normalizedQuery)) return true
      if (filteredCoinAddress.toLowerCase().includes(normalizedQuery)) return true

      const allAddresses = new Set<string>([
        ...Object.values(account.networkAddresses),
        ...Object.values(account.addresses)
      ])

      for (const address of allAddresses) {
        if (String(address).toLowerCase().includes(normalizedQuery)) return true
      }

      return false
    })
  }, [accounts, coinFilter, searchQuery, activeNetworkId])

  const resolvePreviewAddress = (account: typeof accounts[number]): string => {
    if (coinFilter !== 'all') {
      const coinAddress = String(account.networkAddresses[coinFilter] || '').trim()
      return coinAddress || 'No address for selected coin'
    }

    for (const option of coinOptions) {
      const networkAddress = String(account.networkAddresses[option.id] || '').trim()
      if (networkAddress) return networkAddress
    }

    return account.addresses.UTXO || account.addresses.EVM || 'No address'
  }

  const rejectAndClose = async (): Promise<void> => {
    if (canUseChromeStorage() && pendingApproval) {
      await chrome.storage.local.set({
        [DAPP_PENDING_APPROVAL_STORAGE_KEY]: {
          ...pendingApproval,
          status: 'rejected',
          updatedAt: Date.now()
        }
      })
    }
    navigate('/wallet/assets')
    window.close()
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
          <Button className="w-full btn-primary" onClick={() => navigate('/wallet/assets')}>
            Back to wallet
          </Button>
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

      <div className="flex-1 p-6 space-y-6">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center overflow-hidden">
            <div className="w-8 h-8 bg-blue-500 rounded-full" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold">Connect With MetaYoshi</h2>
            <p className="text-xs text-gray-400">{pendingApproval.origin}</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase">Select the account(s) to use on this site</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search account or address"
              className="h-10 rounded-lg border border-dark-600 bg-dark-700/60 px-3 text-xs text-white placeholder:text-gray-500 outline-none focus:border-primary"
            />
            <select
              value={coinFilter}
              onChange={(event) => setCoinFilter(event.target.value)}
              className="h-10 rounded-lg border border-dark-600 bg-dark-700/60 px-3 text-xs text-white outline-none focus:border-primary"
            >
              <option value="all">All coins</option>
              {coinOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[10px] text-gray-500">
            {selectedAccounts.length} selected
          </p>
          <div className="space-y-2">
            {filteredAccounts.map((account) => {
              const previewAddress = resolvePreviewAddress(account)
              const displayName = getAccountDisplayName(
                account,
                coinFilter === 'all' ? activeNetworkId : coinFilter,
                account.name
              )
              return (
                <div
                  key={account.id}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedAccounts.includes(account.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-dark-600 bg-dark-700/50 hover:bg-dark-700'
                  }`}
                  onClick={() => toggleAccount(account.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{displayName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {previewAddress.startsWith('No address')
                          ? previewAddress
                          : `${previewAddress.slice(0, 14)}...`}
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedAccounts.includes(account.id) ? 'bg-primary border-primary' : 'border-dark-600'
                  }`}>
                    {selectedAccounts.includes(account.id) && <IoCheckmarkCircle className="text-white w-4 h-4" />}
                  </div>
                </div>
              )
            })}
            {filteredAccounts.length === 0 && (
              <div className="p-4 rounded-xl border border-dark-600 bg-dark-700/30 text-xs text-center text-gray-400">
                No accounts match this filter.
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="p-4 border-t border-dark-600 flex gap-4">
        <Button variant="outline" className="flex-1" onClick={() => { void rejectAndClose() }}>
          Cancel
        </Button>
        <Button
          className="flex-1 btn-primary"
          onClick={() => navigate('/dapp/connect/2')}
          disabled={selectedAccounts.length === 0}
        >
          Next
        </Button>
      </footer>
    </div>
  )

  if (isLocked) {
    return (
      <PasswordGate
        title="Unlock to connect dApp"
        description="Enter your wallet password to review and approve this dApp connection."
      >
        {content}
      </PasswordGate>
    )
  }

  return content
}

export default DappConnectStep1
