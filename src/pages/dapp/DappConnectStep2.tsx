import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IoArrowBack, IoCheckmarkCircle } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { PasswordGate } from '../../components/PasswordGate'
import {
  DAPP_PENDING_APPROVAL_STORAGE_KEY,
  parseDappPendingApproval,
  type DappPendingApproval,
  type DappScope
} from '../../lib/dappPermissions'
import { useWalletStore } from '../../store/walletStore'

function canUseChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
}

function scopeLabel(scope: DappScope): string {
  if (scope === 'read') return 'See your selected RTM address'
  if (scope === 'sign') return 'Request message signatures (currently disabled in SDK)'
  if (scope === 'send_coin') return 'Request RTM transfers (wallet_sendTransaction)'
  return 'Request asset transfers (wallet_sendAsset)'
}

const DappConnectStep2: React.FC = () => {
  const navigate = useNavigate()
  const { addAuthorizedSite, accounts, activeAccountId, isLocked } = useWalletStore()
  const [pendingApproval, setPendingApproval] = useState<DappPendingApproval | null>(null)
  const [loadingApproval, setLoadingApproval] = useState(true)

  const activeAccount = useMemo(
    () => accounts.find((account) => account.id === activeAccountId) || accounts[0],
    [accounts, activeAccountId]
  )
  const activeAccountName = activeAccount?.name ?? 'Account'

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

  const finishApproval = async (status: 'approved' | 'rejected'): Promise<void> => {
    if (!pendingApproval || !canUseChromeStorage()) {
      navigate('/wallet/assets')
      return
    }

    if (status === 'approved') {
      addAuthorizedSite(pendingApproval.origin)
    }

    await chrome.storage.local.set({
      [DAPP_PENDING_APPROVAL_STORAGE_KEY]: {
        ...pendingApproval,
        status,
        updatedAt: Date.now()
      }
    })

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
        <div className="flex items-center gap-2">
          <Link to="/dapp/connect/1" className="text-gray-400 hover:text-white">
            <IoArrowBack className="w-5 h-5" />
          </Link>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Connecting Wallet with Dapp</span>
        </div>
        <span className="text-xs font-bold text-primary">2 of 2</span>
      </header>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center overflow-hidden">
            <div className="w-8 h-8 bg-blue-500 rounded-full" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold">Connect to {activeAccountName}</h2>
            <p className="text-xs text-gray-400">{pendingApproval.origin}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-dark-600 bg-dark-700/50">
            <p className="text-xs font-bold text-gray-400 uppercase mb-4">Permissions requested:</p>
            <ul className="space-y-3">
              {pendingApproval.scopes.map((scope) => (
                <PermissionItem key={scope} label={scopeLabel(scope)} />
              ))}
            </ul>
          </div>

          <p className="text-[10px] text-gray-500 leading-tight">
            Only connect with trusted sites. MetaYoshi only works with Raptoreum (RTM) mainnet coins and assets.
          </p>
        </div>
      </div>

      <footer className="p-4 border-t border-dark-600 flex gap-4">
        <Button variant="outline" className="flex-1" onClick={() => { void finishApproval('rejected') }}>
          Cancel
        </Button>
        <Button className="flex-1 btn-primary" onClick={() => { void finishApproval('approved') }}>
          Connect
        </Button>
      </footer>
    </div>
  )

  if (isLocked) {
    return (
      <PasswordGate
        title="Unlock to approve dApp"
        description="Enter your wallet password to confirm this website authorization."
      >
        {content}
      </PasswordGate>
    )
  }

  return content
}

const PermissionItem: React.FC<{ label: string }> = ({ label }) => (
  <li className="flex items-center gap-2 text-xs font-medium text-gray-200">
    <IoCheckmarkCircle className="text-primary w-4 h-4 flex-shrink-0" />
    {label}
  </li>
)

export default DappConnectStep2
