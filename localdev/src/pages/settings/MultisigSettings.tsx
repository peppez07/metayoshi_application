import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoArrowBack, IoRefreshOutline } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useWalletStore } from '../../store/walletStore'
import { getAccountDisplayName } from '../../lib/accountName'
import { getAccountKindLabel, isMultisigAccount } from '../../lib/multisig'

const MultisigSettings: React.FC = () => {
  const navigate = useNavigate()
  const {
    accounts,
    networks,
    addMultisigAccount,
    refreshMultisigMetadata,
    listMultisigPendingTransactions,
    confirmMultisigTransaction,
    executeMultisigTransaction
  } = useWalletStore()

  const evmNetworks = useMemo(() => networks.filter((network) => network.coinType === 'EVM'), [networks])
  const standardAccounts = useMemo(
    () => accounts.filter((account) => account.kind !== 'multisig'),
    [accounts]
  )
  const multisigAccounts = useMemo(
    () => accounts.filter((account) => isMultisigAccount(account)),
    [accounts]
  )

  const [networkId, setNetworkId] = useState(() => evmNetworks[0]?.id || '')
  const [accountName, setAccountName] = useState('')
  const [safeAddress, setSafeAddress] = useState('')
  const [ownerSignerAccountId, setOwnerSignerAccountId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pendingByAccount, setPendingByAccount] = useState<Record<string, Awaited<ReturnType<typeof listMultisigPendingTransactions>>>>({})

  useEffect(() => {
    if (networkId) return
    setNetworkId(evmNetworks[0]?.id || '')
  }, [evmNetworks, networkId])

  const refreshPending = async (accountId?: string) => {
    const targets = accountId
      ? multisigAccounts.filter((account) => account.id === accountId)
      : multisigAccounts

    const results = await Promise.all(targets.map(async (account) => {
      const rows = await listMultisigPendingTransactions(account.id).catch(() => [])
      return [account.id, rows] as const
    }))

    setPendingByAccount((prev) => {
      const next = { ...prev }
      for (const [id, rows] of results) next[id] = rows
      return next
    })
  }

  useEffect(() => {
    void refreshPending()
  }, [multisigAccounts.length])

  const handleImport = async () => {
    setError('')
    if (!networkId) {
      setError('Choose an EVM network')
      return
    }
    if (!accountName.trim()) {
      setError('Account name is required')
      return
    }
    if (!safeAddress.trim()) {
      setError('Safe address is required')
      return
    }

    setBusy(true)
    try {
      await addMultisigAccount({
        name: accountName.trim(),
        networkId,
        safeAddress: safeAddress.trim(),
        ownerSignerAccountId: ownerSignerAccountId || null
      })
      setAccountName('')
      setSafeAddress('')
      setOwnerSignerAccountId('')
      await refreshPending()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="wallet-surface space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">Multisig</p>
            <h2 className="mt-1 text-sm font-semibold text-gray-100">Import and manage EVM Safe accounts</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="wallet-icon-btn h-10 w-10 rounded-[16px]"
            aria-label="Back to settings"
          >
            <IoArrowBack className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="grid gap-3">
          <label className="space-y-1 text-xs">
            <span className="text-gray-400">EVM network</span>
            <select
              value={networkId}
              onChange={(e) => setNetworkId(e.target.value)}
              className="w-full rounded-xl border border-dark-600 bg-dark-800 px-3 py-3 text-sm text-gray-100"
            >
              {evmNetworks.map((network) => (
                <option key={network.id} value={network.id}>{network.name}</option>
              ))}
            </select>
          </label>
          <Input label="Account name" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Treasury Safe" />
          <Input label="Safe address" value={safeAddress} onChange={(e) => setSafeAddress(e.target.value)} placeholder="0x..." className="font-mono text-xs" />
          <label className="space-y-1 text-xs">
            <span className="text-gray-400">Linked owner signer</span>
            <select
              value={ownerSignerAccountId}
              onChange={(e) => setOwnerSignerAccountId(e.target.value)}
              className="w-full rounded-xl border border-dark-600 bg-dark-800 px-3 py-3 text-sm text-gray-100"
            >
              <option value="">No linked owner signer</option>
              {standardAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {getAccountDisplayName(account, networkId, account.name)} ({getAccountKindLabel(account)})
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="text-xs font-bold text-red-300">{error}</p> : null}
          <Button onClick={() => void handleImport()} isLoading={busy}>Import Safe</Button>
        </div>
      </div>

      <div className="wallet-surface space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">Managed Accounts</p>
            <p className="mt-1 text-xs text-gray-500">Safe accounts use proposal-based execution. Message signing stays disabled in v1.</p>
          </div>
          <Button variant="outline" className="px-3" onClick={() => void refreshPending()}>
            <IoRefreshOutline className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {multisigAccounts.length === 0 ? (
          <p className="text-xs text-gray-500">No multisig accounts imported yet.</p>
        ) : multisigAccounts.map((account) => {
          const multisig = (account as any).multisig || {}
          const network = networks.find((candidate) => candidate.id === multisig.networkId)
          const pending = pendingByAccount[account.id] || []
          const owners: string[] = Array.isArray(multisig.owners) ? multisig.owners : []
          return (
            <div key={account.id} className="rounded-2xl border border-dark-600 bg-dark-800/70 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-100">{getAccountDisplayName(account, multisig.networkId, account.name)}</p>
                  <p className="text-[11px] text-gray-500">{network?.name || multisig.networkId || 'Unknown network'} - {multisig.threshold || 0} of {owners.length} </p>
                </div>
                <button
                  type="button"
                  className="wallet-icon-btn h-9 w-9 rounded-[14px]"
                  onClick={() => void refreshMultisigMetadata(account.id).then(() => refreshPending(account.id))}
                  aria-label="Refresh Safe metadata"
                >
                  <IoRefreshOutline className="h-4 w-4" />
                </button>
              </div>
              <p className="break-all rounded-xl bg-dark-900/70 px-3 py-2 font-mono text-[11px] text-gray-300">{multisig.address || 'Unknown Safe address'}</p>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Owners</p>
                {owners.length === 0 ? (
                  <p className="text-xs text-gray-500">No owner list available yet.</p>
                ) : owners.map((owner) => (
                  <p key={owner} className="font-mono text-[11px] text-gray-400">{owner}</p>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Pending proposals</p>
                {pending.length === 0 ? (
                  <p className="text-xs text-gray-500">No pending Safe transactions.</p>
                ) : pending.map((row) => (
                  <div key={row.safeTxHash} className="rounded-xl border border-dark-600 bg-dark-900/60 p-3 space-y-2">
                    <p className="font-mono text-[11px] text-gray-300 break-all">{row.safeTxHash}</p>
                    <p className="text-[11px] text-gray-500">Nonce {row.nonce} - {row.confirmationsSubmitted}/{row.confirmationsRequired} confirmations</p>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => void confirmMultisigTransaction({ accountId: account.id, safeTxHash: row.safeTxHash }).then(() => refreshPending(account.id))}>
                        Confirm
                      </Button>
                      <Button className="flex-1" onClick={() => void executeMultisigTransaction({ accountId: account.id, safeTxHash: row.safeTxHash }).then(() => refreshPending(account.id))}>
                        Execute
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MultisigSettings
