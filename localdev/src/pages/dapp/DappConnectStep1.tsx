import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import {
  DAPP_PENDING_APPROVAL_STORAGE_KEY,
  type DappPendingApproval,
  type DappScope
} from '../../lib/dappPermissions'
import { getAccountDisplayName } from '../../lib/accountName'
import { getAccountAddressForNetwork, getAccountKindLabel, isMultisigAccount } from '../../lib/multisig'
import { useWalletStore } from '../../store/walletStore'
import DappApprovalStatus from './DappApprovalStatus'
import { canUseChromeStorage, usePendingDappApproval } from './usePendingDappApproval'

function resolveConnectApprovalTarget(
  activeAccount: Parameters<typeof getAccountAddressForNetwork>[0],
  networks: Array<{ id: string; name?: string; coinType?: string }>,
  preferredNetworkId: string
) {
  const preferredNetwork = networks.find((network) => network.id === preferredNetworkId) || null
  const preferredAddress = String(
    getAccountAddressForNetwork(activeAccount, preferredNetworkId, preferredNetwork?.coinType) || ''
  ).trim()

  if (preferredNetwork && preferredAddress) {
    return {
      network: preferredNetwork,
      networkId: preferredNetworkId,
      address: preferredAddress
    }
  }

  return {
    network: preferredNetwork || networks[0] || null,
    networkId: preferredNetworkId,
    address: ''
  }
}

function scopeLabel(scope: DappScope): string {
  if (scope === 'read') return 'Read wallet addresses and balances'
  if (scope === 'sign') return 'Request message signatures (currently disabled in SDK)'
  if (scope === 'send_coin') return 'Request native coin transfers'
  if (scope === 'select_account') return 'Request to switch your active wallet account'
  if (scope === 'switch_network') return 'Switch your active wallet network for this site'
  return 'Request token/NFT transfers (ERC20/721/1155, SPL Tokens/SPL NFTs/cNFTs, CW20/721, denom assets where supported)'
}

const DappConnectStep1: React.FC = () => {
  const navigate = useNavigate()
  const { accounts, activeAccountId, activeNetworkId, networks } = useWalletStore()
  const { pendingApproval, loadingApproval } = usePendingDappApproval()
  const [approvalSnapshot, setApprovalSnapshot] = useState<DappPendingApproval | null>(null)

  useEffect(() => {
    if (!pendingApproval || pendingApproval.status !== 'pending' || pendingApproval.expiresAt <= Date.now()) return
    setApprovalSnapshot(pendingApproval)
  }, [pendingApproval])

  const displayedApproval = (
    pendingApproval && pendingApproval.status === 'pending' && pendingApproval.expiresAt > Date.now()
      ? pendingApproval
      : approvalSnapshot && approvalSnapshot.status === 'pending' && approvalSnapshot.expiresAt > Date.now()
        ? approvalSnapshot
        : null
  )

  const activeAccount = useMemo(
    () => accounts.find((account) => account.id === activeAccountId) || accounts[0],
    [accounts, activeAccountId]
  )
  const approvalNetworkId = String(displayedApproval?.networkId || activeNetworkId || '').trim()
  const approvalTarget = useMemo(
    () => resolveConnectApprovalTarget(
      activeAccount,
      networks,
      approvalNetworkId || String(activeNetworkId || '').trim()
    ),
    [activeAccount, networks, approvalNetworkId, activeNetworkId]
  )
  const approvalNetwork = approvalTarget.network || networks.find((network) => network.id === activeNetworkId) || networks[0]
  const activeAccountName = useMemo(
    () => getAccountDisplayName(activeAccount, approvalTarget.networkId || approvalNetworkId || activeNetworkId, 'Account'),
    [activeAccount, approvalTarget.networkId, approvalNetworkId, activeNetworkId]
  )
  const activeAccountKindLabel = getAccountKindLabel(activeAccount)
  const isActiveMultisig = isMultisigAccount(activeAccount)
  const approvalAddress = approvalTarget.address

  const rejectAndClose = async (): Promise<void> => {
    if (canUseChromeStorage() && displayedApproval) {
      await chrome.storage.local.set({
        [DAPP_PENDING_APPROVAL_STORAGE_KEY]: {
          ...displayedApproval,
          status: 'rejected',
          updatedAt: Date.now()
        }
      })
    }
    navigate('/wallet/assets')
  }

  if (loadingApproval && !displayedApproval) {
    return <DappApprovalStatus loading={loadingApproval} onBack={() => navigate('/wallet/assets')} />
  }

  if (!displayedApproval) {
    return <DappApprovalStatus loading={loadingApproval} onBack={() => navigate('/wallet/assets')} />
  }

  const content = (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 flex items-center justify-between border-b border-dark-600">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Connecting Wallet with Dapp</span>
        <span className="text-xs font-bold text-primary">1 of 2</span>
      </header>

      <div className="flex-1 min-h-0 p-6 space-y-6 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center overflow-hidden">
            <div className="w-8 h-8 bg-blue-500 rounded-full" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold">Connect With MetaYoshi</h2>
            <p className="text-xs text-gray-400">{displayedApproval.origin}</p>
            <div className="mt-3 flex justify-center">
              <span className="rounded-full border border-dark-600 bg-dark-800 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-200">
                {activeAccountKindLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-3 rounded-xl border border-dark-600 bg-dark-700/40">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Requested scopes</p>
            <div className="space-y-1">
              {displayedApproval.scopes.map((scope) => (
                <p key={scope} className="text-[11px] text-gray-300">{scopeLabel(scope)}</p>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-dark-600 bg-dark-700/50 space-y-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Requested connection</p>
              <div className="rounded-xl border border-dark-600 bg-dark-800/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{activeAccountName}</p>
                  <p className="text-[10px] text-gray-400">{approvalNetwork?.name || 'Requested network'}</p>
                  </div>
                </div>
                <p className="mt-3 break-all rounded-lg bg-dark-900/70 px-3 py-2 font-mono text-[10px] text-gray-300">
                  {approvalAddress || 'No address available on the requested network'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-[11px] leading-relaxed">
              <p className="text-gray-300">
                This approval connects the site to your active wallet account on {approvalNetwork?.name || 'the requested network'}.
                MetaYoshi does not apply this approval to a custom account list.
              </p>
              {isActiveMultisig && (
                <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100">
                  Multisig metadata is recognized separately from the public address. The site still only sees one account
                  address here.
                </p>
              )}
              <p className="text-gray-400">
                If the site later asks to change accounts, MetaYoshi will require a separate approval before switching
                your active wallet account.
              </p>
              {!approvalAddress && (
                <p className="text-red-300">
                  Switch to an account with an address on {approvalNetwork?.name || 'the requested network'} before
                  continuing.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="p-4 border-t border-dark-600 flex gap-4">
        <Button variant="outline" className="flex-1" onClick={() => { void rejectAndClose() }}>
          Cancel
        </Button>
        <Button className="flex-1 btn-primary" onClick={() => navigate('/dapp/connect/2')} disabled={!approvalAddress}>
          Next
        </Button>
      </footer>
    </div>
  )

  return content
}

export default DappConnectStep1
