import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoArrowBack,
  IoCheckmarkCircle,
  IoInformationCircleOutline,
  IoRefreshOutline,
  IoShieldCheckmarkOutline,
  IoSwapHorizontalOutline,
  IoWarningOutline
} from 'react-icons/io5'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useToast } from '../../components/Toast'
import { useWalletStore } from '../../store/walletStore'
import { getAccountDisplayName } from '../../lib/accountName'
import { getAccountAddressForNetwork, getAccountKindLabel, isMultisigAccount } from '../../lib/multisig'
import { splitNetworksByChain } from '../../lib/networkVisibility'

function ToggleCard({
  title,
  description,
  checked,
  onChange,
  accentClass
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  accentClass: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full flex-col items-start gap-3 rounded-2xl border border-dark-600 bg-dark-800/70 px-4 py-4 text-left transition-colors hover:bg-dark-700/80 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-100">{title}</p>
        <p className="mt-1 break-words text-xs text-gray-500">{description}</p>
      </div>
      <div
        className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors ${
          checked ? accentClass : 'border-dark-500 bg-dark-900/80'
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  )
}

const MultisigSettings: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const {
    accounts,
    networks,
    multisigSettings,
    setMultisigEnabled,
    setCrossChainMultisigEnabled,
    setMultisigNetworkAllowed,
    setDefaultMultisigNetworkId,
    addMultisigAccount,
    refreshMultisigMetadata,
    listMultisigPendingTransactions,
    confirmMultisigTransaction,
    executeMultisigTransaction
  } = useWalletStore()

  const evmNetworks = useMemo(() => networks.filter((network) => network.coinType === 'EVM'), [networks])
  const standardAccounts = useMemo(() => accounts.filter((account) => !isMultisigAccount(account)), [accounts])
  const multisigAccounts = useMemo(() => accounts.filter((account) => isMultisigAccount(account)), [accounts])
  const allowedNetworkIds = useMemo(() => new Set(multisigSettings.allowedNetworkIds), [multisigSettings.allowedNetworkIds])
  const allowedNetworks = useMemo(
    () => evmNetworks.filter((network) => allowedNetworkIds.has(network.id)),
    [allowedNetworkIds, evmNetworks]
  )
  const groupedEvmNetworks = useMemo(() => splitNetworksByChain(evmNetworks), [evmNetworks])

  const [networkId, setNetworkId] = useState('')
  const [accountName, setAccountName] = useState('')
  const [safeAddress, setSafeAddress] = useState('')
  const [ownerSignerAccountId, setOwnerSignerAccountId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [actionBusyKey, setActionBusyKey] = useState('')
  const [pendingByAccount, setPendingByAccount] = useState<Record<string, Awaited<ReturnType<typeof listMultisigPendingTransactions>>>>({})

  useEffect(() => {
    const preferred = multisigSettings.defaultNetworkId || allowedNetworks[0]?.id || evmNetworks[0]?.id || ''
    if (!preferred) return
    if (networkId && (allowedNetworkIds.has(networkId) || (!multisigSettings.enabled && evmNetworks.some((network) => network.id === networkId)))) {
      return
    }
    setNetworkId(preferred)
  }, [allowedNetworkIds, allowedNetworks, evmNetworks, multisigSettings.defaultNetworkId, multisigSettings.enabled, networkId])

  const refreshPending = async (accountId?: string) => {
    const targets = accountId
      ? multisigAccounts.filter((account) => account.id === accountId)
      : multisigAccounts

    const results = await Promise.all(targets.map(async (account) => {
      const rows = await listMultisigPendingTransactions(account.id).catch(() => [])
      return [account.id, rows] as const
    }))

    setPendingByAccount((current) => {
      const next = { ...current }
      for (const [id, rows] of results) next[id] = rows
      return next
    })
  }

  useEffect(() => {
    void refreshPending()
  }, [multisigAccounts.length])

  const recommendedNetwork = evmNetworks[0] || null

  const enableRecommendedSetup = () => {
    if (!recommendedNetwork) return
    setMultisigEnabled(true)
    setMultisigNetworkAllowed(recommendedNetwork.id, true)
    setDefaultMultisigNetworkId(recommendedNetwork.id)
    setNetworkId(recommendedNetwork.id)
    setError('')
    showToast(`Multisig enabled on ${recommendedNetwork.name}`, 'success')
  }

  const handleImport = async () => {
    setError('')
    if (!multisigSettings.enabled) {
      setError('Enable multisig before importing Safe accounts.')
      return
    }
    if (!networkId) {
      setError('Choose a multisig chain.')
      return
    }
    if (!allowedNetworkIds.has(networkId)) {
      setError('Choose a chain that is enabled for multisig.')
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
      showToast('Safe account imported', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 pb-1">
      <div className="wallet-surface space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Multisig Policy</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-gray-100">Enable multisig and choose the chains it can use</h2>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">
                Beta
              </span>
            </div>
            <p className="mt-2 break-words text-xs leading-relaxed text-gray-500">
              This page controls wallet policy for multisig accounts. EVM Safe is the only executable multisig family in v1.
            </p>
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
          <ToggleCard
            title="Enable multisig"
            description="Show multisig controls and allow Safe imports in the wallet UI."
            checked={multisigSettings.enabled}
            onChange={setMultisigEnabled}
            accentClass="border-emerald-500/40 bg-emerald-500/15"
          />
          <ToggleCard
            title="Enable cross-chain multisig"
            description="Enable cross-chain policy now. Execution remains Safe-only on supported EVM chains in this build."
            checked={multisigSettings.crossChainEnabled}
            onChange={setCrossChainMultisigEnabled}
            accentClass="border-violet-500/40 bg-violet-500/15"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-dark-600 bg-dark-900/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Status</p>
            <p className="mt-2 text-sm font-semibold text-gray-100">
              {multisigSettings.enabled ? 'Multisig enabled' : 'Multisig disabled'}
            </p>
            <p className="mt-1 text-xs text-gray-500">Controls whether multisig flows appear in wallet settings and account setup.</p>
          </div>
          <div className="rounded-2xl border border-dark-600 bg-dark-900/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Allowed chains</p>
            <p className="mt-2 text-sm font-semibold text-gray-100">{allowedNetworks.length}</p>
            <p className="mt-1 text-xs text-gray-500">Only these chains can be used for importing Safe accounts.</p>
          </div>
          <div className="rounded-2xl border border-dark-600 bg-dark-900/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Managed safes</p>
            <p className="mt-2 text-sm font-semibold text-gray-100">{multisigAccounts.length}</p>
            <p className="mt-1 text-xs text-gray-500">Imported multisig accounts currently tracked by this wallet.</p>
          </div>
        </div>
      </div>

      <div className="wallet-surface space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Allowed Chains</p>
            <p className="mt-1 break-words text-xs text-gray-500">
              Pick which EVM chains may host Safe accounts in this wallet.
            </p>
          </div>
          <span className="inline-flex max-w-full self-start rounded-full border border-dark-600 bg-dark-900/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-300 sm:self-auto">
            {multisigSettings.allowedNetworkIds.length} selected
          </span>
        </div>

        <div className="space-y-3">
          {[
            { key: 'main', label: 'Mainnet', rows: groupedEvmNetworks.main },
            { key: 'test', label: 'Testnet', rows: groupedEvmNetworks.test }
          ].map((section) => (
            section.rows.length > 0 ? (
              <div key={section.key} className="space-y-2">
                <div className="flex items-center justify-between px-1 pt-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                    {section.label}
                  </p>
                  <p className="text-[10px] text-gray-600">
                    {section.rows.length}
                  </p>
                </div>
                {section.rows.map((network) => {
                  const selected = allowedNetworkIds.has(network.id)
                  const isDefault = multisigSettings.defaultNetworkId === network.id
                  return (
                    <label
                      key={network.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                        selected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-dark-600 bg-dark-800/70'
                      } hover:bg-dark-700/70`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-100">{network.name}</p>
                          <span className="rounded-full border border-dark-600 bg-dark-900/80 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-gray-300">
                            {network.symbol}
                          </span>
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
                            Safe supported
                          </span>
                          {isDefault ? (
                            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-primary">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 break-words text-xs text-gray-500">
                          Safe import and proposal execution are supported on this chain.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => setMultisigNetworkAllowed(network.id, event.target.checked)}
                        className="h-4 w-4 accent-primary"
                      />
                    </label>
                  )
                })}
              </div>
            ) : null
          ))}
        </div>

        {evmNetworks.length === 0 ? (
          <div className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
            <IoWarningOutline className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-300" />
            <p className="text-xs leading-relaxed text-gray-300">
              No EVM networks are available in the wallet right now, so multisig chain policy cannot be configured.
            </p>
          </div>
        ) : null}

        <label className="block space-y-1 text-xs">
          <span className="text-gray-400">Default multisig chain</span>
          <select
            value={multisigSettings.defaultNetworkId || ''}
            onChange={(event) => setDefaultMultisigNetworkId(event.target.value || null)}
            className="w-full rounded-xl border border-dark-600 bg-dark-800 px-3 py-3 text-sm text-gray-100"
            disabled={allowedNetworks.length === 0}
          >
            <option value="">Choose a default chain</option>
            {allowedNetworks.map((network) => (
              <option key={network.id} value={network.id}>{network.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="wallet-surface space-y-3">
        <div className="flex items-start gap-2">
          <IoShieldCheckmarkOutline className="h-4.5 w-4.5 text-emerald-300" />
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Supported Family</p>
            <p className="mt-1 break-words text-xs text-gray-500">
              EVM Safe v1 is available now. Other multisig families and true cross-chain execution are not implemented yet.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-dark-600 bg-dark-800/70 p-4">
            <p className="text-sm font-semibold text-gray-100">Safe v1</p>
            <p className="mt-2 text-xs text-gray-500">Imported Safe accounts can propose, confirm, and execute on supported EVM chains.</p>
          </div>
          <div className="rounded-2xl border border-dark-600 bg-dark-800/70 p-4">
            <p className="text-sm font-semibold text-gray-100">Cross-chain</p>
            <p className="mt-2 text-xs text-gray-500">
              {multisigSettings.crossChainEnabled
                ? 'Policy is enabled, but execution remains limited to Safe-capable EVM chains.'
                : 'Policy is disabled. Only the selected Safe chains are active for multisig.'}
            </p>
          </div>
        </div>
      </div>

      <div className="wallet-surface space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Import Safe</p>
            <p className="mt-1 break-words text-xs text-gray-500">
              Import an existing Safe on one of the enabled chains. The linked owner signer remains a local wallet account.
            </p>
          </div>
          <span className={`inline-flex max-w-full self-start rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] sm:self-auto ${
            multisigSettings.enabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
          }`}>
            {multisigSettings.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {!multisigSettings.enabled ? (
          <div className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
            <IoWarningOutline className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-relaxed text-gray-300">
                Turn multisig on above before importing Safe accounts. Existing multisig accounts remain visible below.
              </p>
              {recommendedNetwork ? (
                <Button type="button" variant="outline" size="sm" className="mt-3 px-3" onClick={enableRecommendedSetup}>
                  Enable on {recommendedNetwork.name}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {multisigSettings.enabled && allowedNetworks.length === 0 ? (
          <div className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
            <IoWarningOutline className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-300" />
            <p className="text-xs leading-relaxed text-gray-300">
              Multisig is enabled, but no chains are allowed yet. Select at least one chain above before importing a Safe.
            </p>
          </div>
        ) : null}

        <div className="grid gap-3">
          <label className="space-y-1 text-xs">
            <span className="text-gray-400">Chain</span>
            <select
              value={networkId}
              onChange={(event) => setNetworkId(event.target.value)}
              className="w-full rounded-xl border border-dark-600 bg-dark-800 px-3 py-3 text-sm text-gray-100"
              disabled={allowedNetworks.length === 0}
            >
              <option value="">Choose a chain</option>
              {allowedNetworks.map((network) => (
                <option key={network.id} value={network.id}>{network.name}</option>
              ))}
            </select>
          </label>
          <Input label="Account name" value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="Treasury Safe" />
          <Input label="Safe address" value={safeAddress} onChange={(event) => setSafeAddress(event.target.value)} placeholder="0x..." className="font-mono text-xs" />
          <label className="space-y-1 text-xs">
            <span className="text-gray-400">Linked owner signer</span>
            <select
              value={ownerSignerAccountId}
              onChange={(event) => setOwnerSignerAccountId(event.target.value)}
              className="w-full rounded-xl border border-dark-600 bg-dark-800 px-3 py-3 text-sm text-gray-100"
            >
              <option value="">No linked owner signer</option>
              {standardAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {getAccountDisplayName(account, networkId || multisigSettings.defaultNetworkId || '', account.name)} ({getAccountKindLabel(account)})
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="text-xs font-bold text-red-300">{error}</p> : null}
          <Button onClick={() => void handleImport()} isLoading={busy} disabled={!multisigSettings.enabled || allowedNetworks.length === 0}>
            {multisigSettings.enabled ? 'Import Safe' : 'Enable multisig first'}
          </Button>
        </div>
      </div>

      <div className="wallet-surface space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Managed Accounts</p>
            <p className="mt-1 break-words text-xs text-gray-500">
              {multisigAccounts.length > 0
                ? 'Review owners, thresholds, and pending proposals for imported Safe accounts.'
                : 'No multisig accounts imported yet.'}
            </p>
          </div>
          <Button
            variant="outline"
            className="self-start px-3 sm:self-auto"
            onClick={() => void refreshPending().then(() => showToast('Pending proposals refreshed', 'success')).catch((err) => showToast(err instanceof Error ? err.message : String(err), 'error'))}
          >
            <IoRefreshOutline className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {multisigAccounts.length === 0 ? (
          <div className="flex gap-3 rounded-2xl border border-dark-600 bg-dark-800/70 p-4">
            <IoInformationCircleOutline className="mt-0.5 h-4.5 w-4.5 shrink-0 text-sky-300" />
            <p className="text-xs leading-relaxed text-gray-300">
              Imported Safe accounts will appear here with owner lists, threshold details, and pending proposal actions.
            </p>
          </div>
        ) : multisigAccounts.map((account) => {
          const multisig = account.multisig || {}
          const network = networks.find((candidate) => candidate.id === multisig.networkId) || null
          const pending = pendingByAccount[account.id] || []
          const owners = Array.isArray(multisig.owners) ? multisig.owners : []
          const linkedSigner = multisig.ownerSignerAccountId
            ? accounts.find((candidate) => candidate.id === multisig.ownerSignerAccountId) || null
            : null

          return (
            <div key={account.id} className="space-y-3 rounded-2xl border border-dark-600 bg-dark-800/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-100">{getAccountDisplayName(account, multisig.networkId, account.name)}</p>
                    <span className="rounded-full border border-dark-600 bg-dark-900/80 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-gray-300">
                      {getAccountKindLabel(account)}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-[11px] text-gray-500">
                    {network?.name || multisig.networkId || 'Unknown network'} · {multisig.threshold || 0} of {owners.length}
                  </p>
                </div>
                <button
                  type="button"
                  className="wallet-icon-btn h-9 w-9 rounded-[14px]"
                  onClick={() => void refreshMultisigMetadata(account.id).then(() => refreshPending(account.id)).then(() => showToast('Safe metadata refreshed', 'success')).catch((err) => showToast(err instanceof Error ? err.message : String(err), 'error'))}
                  aria-label="Refresh Safe metadata"
                >
                  <IoRefreshOutline className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-xl border border-dark-600 bg-dark-900/70 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Safe address</p>
                <p className="mt-1 break-all font-mono text-[11px] text-gray-300">
                  {getAccountAddressForNetwork(account, multisig.networkId, network?.coinType) || multisig.address || 'Unknown Safe address'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-dark-600 bg-dark-900/50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Owners</p>
                  <div className="mt-2 space-y-1">
                    {owners.length === 0 ? (
                      <p className="text-xs text-gray-500">No owner list available yet.</p>
                    ) : owners.map((owner) => (
                      <p key={owner} className="break-all font-mono text-[11px] text-gray-400">{owner}</p>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-dark-600 bg-dark-900/50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Linked signer</p>
                  <p className="mt-2 break-words text-xs text-gray-300">
                    {linkedSigner
                      ? getAccountDisplayName(linkedSigner, multisig.networkId, linkedSigner.name)
                      : 'No owner signer linked'}
                  </p>
                  {linkedSigner ? (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
                      <IoCheckmarkCircle className="h-3.5 w-3.5" />
                      Ready
                    </div>
                  ) : (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
                      <IoWarningOutline className="h-3.5 w-3.5" />
                      Signer missing
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Pending proposals</p>
                {pending.length === 0 ? (
                  <p className="text-xs text-gray-500">No pending Safe transactions.</p>
                ) : pending.map((row) => (
                  <div key={row.safeTxHash} className="space-y-2 rounded-xl border border-dark-600 bg-dark-900/60 p-3">
                    <p className="break-all font-mono text-[11px] text-gray-300">{row.safeTxHash}</p>
                    <p className="break-words text-[11px] text-gray-500">
                      Nonce {row.nonce} · {row.confirmationsSubmitted}/{row.confirmationsRequired} confirmations
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        variant="outline"
                        className="w-full flex-1"
                        isLoading={actionBusyKey === `confirm:${row.safeTxHash}`}
                        onClick={() => void (async () => {
                          setActionBusyKey(`confirm:${row.safeTxHash}`)
                          try {
                            await confirmMultisigTransaction({ accountId: account.id, safeTxHash: row.safeTxHash })
                            await refreshPending(account.id)
                            showToast('Safe proposal confirmed', 'success')
                          } catch (err) {
                            showToast(err instanceof Error ? err.message : String(err), 'error')
                          } finally {
                            setActionBusyKey('')
                          }
                        })()}
                      >
                        Confirm
                      </Button>
                      <Button
                        className="w-full flex-1"
                        isLoading={actionBusyKey === `execute:${row.safeTxHash}`}
                        onClick={() => void (async () => {
                          setActionBusyKey(`execute:${row.safeTxHash}`)
                          try {
                            await executeMultisigTransaction({ accountId: account.id, safeTxHash: row.safeTxHash })
                            await refreshPending(account.id)
                            showToast('Safe proposal executed', 'success')
                          } catch (err) {
                            showToast(err instanceof Error ? err.message : String(err), 'error')
                          } finally {
                            setActionBusyKey('')
                          }
                        })()}
                      >
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

      <div className="wallet-surface space-y-3">
        <div className="flex items-start gap-2">
          <IoSwapHorizontalOutline className="h-4.5 w-4.5 text-violet-300" />
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Cross-chain Status</p>
            <p className="mt-1 break-words text-xs text-gray-500">
              {multisigSettings.crossChainEnabled
                ? 'Cross-chain policy is enabled, but execution remains limited to EVM Safe accounts.'
                : 'Cross-chain policy is disabled. Multisig execution remains scoped to the selected Safe chains.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MultisigSettings
