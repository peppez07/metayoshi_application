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
import {
  getAccountAddressForNetwork,
  getAccountKindLabel,
  getMultisigCapabilityForNetwork,
  isBtcMultisigAccount,
  isMultisigAccount,
  isRtmMultisigAccount,
  isSafeMultisigAccount,
  isWalletReadyMultisigNetwork,
  isWatchOnlyAccount
} from '../../lib/multisig'
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
    setMultisigNetworkAllowed,
    setDefaultMultisigNetworkId,
    addMultisigAccount,
    refreshMultisigMetadata,
    listMultisigPendingTransactions,
    confirmMultisigTransaction,
    executeMultisigTransaction
  } = useWalletStore()

  const supportedNetworks = useMemo(() => networks.filter((network) => isWalletReadyMultisigNetwork(network)), [networks])
  const standardAccounts = useMemo(() => accounts.filter((account) => !isMultisigAccount(account) && !isWatchOnlyAccount(account)), [accounts])
  const multisigAccounts = useMemo(() => accounts.filter((account) => isMultisigAccount(account)), [accounts])
  const safeMultisigAccounts = useMemo(() => multisigAccounts.filter((account) => isSafeMultisigAccount(account)), [multisigAccounts])
  const allowedNetworkIds = useMemo(() => new Set(multisigSettings.allowedNetworkIds), [multisigSettings.allowedNetworkIds])
  const allowedNetworks = useMemo(
    () => supportedNetworks.filter((network) => allowedNetworkIds.has(network.id)),
    [allowedNetworkIds, supportedNetworks]
  )
  const groupedSupportedNetworks = useMemo(() => splitNetworksByChain(supportedNetworks), [supportedNetworks])

  const [networkId, setNetworkId] = useState('')
  const [accountName, setAccountName] = useState('')
  const [safeAddress, setSafeAddress] = useState('')
  const [ownerSignerAccountId, setOwnerSignerAccountId] = useState('')
  const [btcAddress, setBtcAddress] = useState('')
  const [witnessScriptHex, setWitnessScriptHex] = useState('')
  const [rtmAddress, setRtmAddress] = useState('')
  const [redeemScriptHex, setRedeemScriptHex] = useState('')
  const [linkedSignerAccountIds, setLinkedSignerAccountIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [actionBusyKey, setActionBusyKey] = useState('')
  const [pendingByAccount, setPendingByAccount] = useState<Record<string, Awaited<ReturnType<typeof listMultisigPendingTransactions>>>>({})

  useEffect(() => {
    const preferred = multisigSettings.defaultNetworkId || allowedNetworks[0]?.id || supportedNetworks[0]?.id || ''
    if (!preferred) return
    if (networkId && (allowedNetworkIds.has(networkId) || (!multisigSettings.enabled && supportedNetworks.some((network) => network.id === networkId)))) {
      return
    }
    setNetworkId(preferred)
  }, [allowedNetworkIds, allowedNetworks, supportedNetworks, multisigSettings.defaultNetworkId, multisigSettings.enabled, networkId])

  const selectedNetwork = useMemo(
    () => allowedNetworks.find((network) => network.id === networkId) || supportedNetworks.find((network) => network.id === networkId) || null,
    [allowedNetworks, networkId, supportedNetworks]
  )
  const selectedCapability = useMemo(() => getMultisigCapabilityForNetwork(selectedNetwork), [selectedNetwork])

  const refreshPending = async (accountId?: string) => {
    const targets = accountId
      ? safeMultisigAccounts.filter((account) => account.id === accountId)
      : safeMultisigAccounts

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
  }, [safeMultisigAccounts.length])

  const recommendedNetwork = supportedNetworks[0] || null

  const toggleLinkedSigner = (accountId: string) => {
    setLinkedSignerAccountIds((current) => (
      current.includes(accountId)
        ? current.filter((item) => item !== accountId)
        : [...current, accountId]
    ))
  }

  const enableRecommendedSetup = () => {
    if (!recommendedNetwork) return
    setMultisigEnabled(true)
    setMultisigNetworkAllowed(recommendedNetwork.id, true)
    setDefaultMultisigNetworkId(recommendedNetwork.id)
    setNetworkId(recommendedNetwork.id)
    setError('')
    showToast(`Multisig enabled on ${recommendedNetwork.name}`, 'success')
  }

  const clearImportForm = () => {
    setAccountName('')
    setSafeAddress('')
    setOwnerSignerAccountId('')
    setBtcAddress('')
    setWitnessScriptHex('')
    setRtmAddress('')
    setRedeemScriptHex('')
    setLinkedSignerAccountIds([])
  }

  const handleImport = async () => {
    setError('')
    if (!multisigSettings.enabled) {
      setError('Enable multisig before importing accounts.')
      return
    }
    if (!networkId) {
      setError('Choose a multisig network.')
      return
    }
    if (!allowedNetworkIds.has(networkId)) {
      setError('Choose a network that is enabled for multisig.')
      return
    }
    if (!accountName.trim()) {
      setError('Account name is required.')
      return
    }
    if (!selectedCapability?.walletReady) {
      setError('The selected network is not wallet-ready for multisig.')
      return
    }

    setBusy(true)
    try {
      if (selectedCapability.family === 'safe') {
        if (!safeAddress.trim()) {
          throw new Error('Safe address is required.')
        }
        if (!ownerSignerAccountId) {
          throw new Error('Choose a linked owner signer.')
        }
        await addMultisigAccount({
          family: 'safe',
          name: accountName.trim(),
          networkId,
          safeAddress: safeAddress.trim(),
          ownerSignerAccountId
        })
        showToast('Safe account imported', 'success')
      } else if (selectedCapability.family === 'btc-psbt-v1') {
        if (!btcAddress.trim()) {
          throw new Error('Bitcoin multisig address is required.')
        }
        if (!witnessScriptHex.trim()) {
          throw new Error('Witness script hex is required.')
        }
        if (linkedSignerAccountIds.length === 0) {
          throw new Error('Choose at least one linked local BTC signer.')
        }
        await addMultisigAccount({
          family: 'btc-psbt-v1',
          name: accountName.trim(),
          networkId,
          address: btcAddress.trim(),
          witnessScriptHex: witnessScriptHex.trim(),
          linkedSignerAccountIds
        })
        showToast('Bitcoin multisig account imported', 'success')
      } else if (selectedCapability.family === 'rtm-utxo-asset-multisig-v1') {
        if (!rtmAddress.trim()) {
          throw new Error('RTM multisig address is required.')
        }
        if (!redeemScriptHex.trim()) {
          throw new Error('Redeem script hex is required.')
        }
        if (linkedSignerAccountIds.length === 0) {
          throw new Error('Choose at least one linked local RTM signer.')
        }
        await addMultisigAccount({
          family: 'rtm-utxo-asset-multisig-v1',
          name: accountName.trim(),
          networkId,
          address: rtmAddress.trim(),
          redeemScriptHex: redeemScriptHex.trim(),
          linkedSignerAccountIds
        })
        showToast('RTM multisig account imported', 'success')
      } else {
        throw new Error('Unsupported multisig family.')
      }
      clearImportForm()
      await refreshPending()
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
              <h2 className="text-base font-semibold text-gray-100">Enable multisig and choose the networks it can use</h2>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">
                Beta
              </span>
            </div>
            <p className="mt-2 break-words text-xs leading-relaxed text-gray-500">
              This page controls wallet policy for wallet-ready multisig networks. Today that means imported Safe accounts on supported EVM chains, imported Bitcoin p2wsh multisig on Bitcoin, and imported RTM script-hash multisig on Raptoreum.
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
            description="Show multisig controls and allow imported accounts only on wallet-ready multisig networks."
            checked={multisigSettings.enabled}
            onChange={setMultisigEnabled}
            accentClass="border-emerald-500/40 bg-emerald-500/15"
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
            <p className="mt-1 text-xs text-gray-500">Only these wallet-ready multisig chains can be used for importing accounts.</p>
          </div>
          <div className="rounded-2xl border border-dark-600 bg-dark-900/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Managed accounts</p>
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
              Pick which wallet-ready multisig chains may host imported accounts in this wallet.
            </p>
          </div>
          <span className="inline-flex max-w-full self-start rounded-full border border-dark-600 bg-dark-900/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-300 sm:self-auto">
            {multisigSettings.allowedNetworkIds.length} selected
          </span>
        </div>

        <div className="space-y-3">
          {[
            { key: 'main', label: 'Mainnet', rows: groupedSupportedNetworks.main },
            { key: 'test', label: 'Testnet', rows: groupedSupportedNetworks.test }
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
                  const capability = getMultisigCapabilityForNetwork(network)
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
                            {capability?.label || 'Wallet-ready'}
                          </span>
                          {isDefault ? (
                            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-primary">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 break-words text-xs text-gray-500">
                          {capability?.family === 'safe'
                            ? 'Safe import and proposal execution are supported on this chain.'
                            : 'Imported multisig accounts are supported on this chain.'}
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

        {supportedNetworks.length === 0 ? (
          <div className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
            <IoWarningOutline className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-300" />
            <p className="text-xs leading-relaxed text-gray-300">
              No wallet-ready multisig networks are available in the wallet right now, so multisig policy cannot be configured.
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
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Supported Families</p>
            <p className="mt-1 break-words text-xs text-gray-500">
              The wallet only exposes multisig families that are explicitly marked wallet-ready. Planned UTXO families stay hidden from import and setup until their contract is implemented.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-dark-600 bg-dark-800/70 p-4">
            <p className="text-sm font-semibold text-gray-100">Safe v1</p>
            <p className="mt-2 text-xs text-gray-500">Imported Safe accounts can propose, confirm, and execute through the MetaYoshi server on supported EVM chains.</p>
          </div>
          <div className="rounded-2xl border border-dark-600 bg-dark-800/70 p-4">
            <p className="text-sm font-semibold text-gray-100">BTC PSBT v1</p>
            <p className="mt-2 text-xs text-gray-500">Imported Bitcoin p2wsh multisig can be validated, signed locally with linked wallet signers, finalized, and relayed through the existing Bitcoin path.</p>
          </div>
          <div className="rounded-2xl border border-dark-600 bg-dark-800/70 p-4">
            <p className="text-sm font-semibold text-gray-100">RTM Multisig v1</p>
            <p className="mt-2 text-xs text-gray-500">Imported RTM script-hash multisig can sign native RTM and RTM asset transfers locally with linked wallet signers, then relay the finalized transaction through the existing RTM path.</p>
          </div>
        </div>
      </div>

      <div className="wallet-surface space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Import Multisig</p>
            <p className="mt-1 break-words text-xs text-gray-500">
              {selectedCapability?.family === 'btc-psbt-v1'
                ? 'Import an existing Bitcoin p2wsh multisig. The witness script must match the address, and enough linked local BTC signers must be available to satisfy the threshold.'
                : selectedCapability?.family === 'rtm-utxo-asset-multisig-v1'
                  ? 'Import an existing RTM script-hash multisig. The redeem script must match the RTM address, and enough linked local RTM signers must be available to satisfy the threshold for native RTM and asset sends.'
                  : 'Import an existing Safe on a supported EVM chain. A linked local owner signer is required for server auth and proposal approval.'}
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
                Turn multisig on above before importing accounts. Existing multisig accounts remain visible below.
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
              Multisig is enabled, but no wallet-ready networks are allowed yet. Select at least one network above before importing an account.
            </p>
          </div>
        ) : null}

        <div className="grid gap-3">
          <label className="space-y-1 text-xs">
            <span className="text-gray-400">Network</span>
            <select
              value={networkId}
              onChange={(event) => setNetworkId(event.target.value)}
              className="w-full rounded-xl border border-dark-600 bg-dark-800 px-3 py-3 text-sm text-gray-100"
              disabled={allowedNetworks.length === 0}
            >
              <option value="">Choose a network</option>
              {allowedNetworks.map((network) => (
                <option key={network.id} value={network.id}>{network.name}</option>
              ))}
            </select>
          </label>
          <Input
            label="Account name"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            placeholder={
              selectedCapability?.family === 'btc-psbt-v1'
                ? 'Treasury BTC Multisig'
                : selectedCapability?.family === 'rtm-utxo-asset-multisig-v1'
                  ? 'Treasury RTM Multisig'
                  : 'Treasury Safe'
            }
          />
          {selectedCapability?.family === 'btc-psbt-v1' ? (
            <>
              <Input
                label="Bitcoin multisig address"
                value={btcAddress}
                onChange={(event) => setBtcAddress(event.target.value)}
                placeholder="bc1..."
                className="font-mono text-xs"
              />
              <Input
                label="Witness script hex"
                value={witnessScriptHex}
                onChange={(event) => setWitnessScriptHex(event.target.value)}
                placeholder="5221..."
                className="font-mono text-xs"
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400">Linked local BTC signers</span>
                  <span className="rounded-full border border-dark-600 bg-dark-900/80 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-gray-300">
                    {linkedSignerAccountIds.length} selected
                  </span>
                </div>
                <div className="space-y-2">
                  {standardAccounts.length === 0 ? (
                    <div className="rounded-2xl border border-dark-600 bg-dark-800/70 p-3 text-xs text-gray-500">
                      No local signing accounts are available yet.
                    </div>
                  ) : standardAccounts.map((account) => {
                    const checked = linkedSignerAccountIds.includes(account.id)
                    const signerAddress = getAccountAddressForNetwork(account, 'srv--bitcoin', 'UTXO') || account.addresses?.BTC || account.addresses?.UTXO || ''
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => toggleLinkedSigner(account.id)}
                        className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                          checked ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-dark-600 bg-dark-800/70 hover:bg-dark-700/70'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-100">
                            {getAccountDisplayName(account, networkId || 'srv--bitcoin', account.name)}
                          </p>
                          <p className="mt-1 break-all font-mono text-[11px] text-gray-500">
                            {signerAddress || 'BTC address unavailable'}
                          </p>
                        </div>
                        <div className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                          checked ? 'border-emerald-400 bg-emerald-400 text-dark-950' : 'border-dark-500 bg-dark-900'
                        }`}>
                          {checked ? <IoCheckmarkCircle className="h-4 w-4" /> : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : selectedCapability?.family === 'rtm-utxo-asset-multisig-v1' ? (
            <>
              <Input
                label="RTM multisig address"
                value={rtmAddress}
                onChange={(event) => setRtmAddress(event.target.value)}
                placeholder="7..."
                className="font-mono text-xs"
              />
              <Input
                label="Redeem script hex"
                value={redeemScriptHex}
                onChange={(event) => setRedeemScriptHex(event.target.value)}
                placeholder="5221..."
                className="font-mono text-xs"
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400">Linked local RTM signers</span>
                  <span className="rounded-full border border-dark-600 bg-dark-900/80 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-gray-300">
                    {linkedSignerAccountIds.length} selected
                  </span>
                </div>
                <div className="space-y-2">
                  {standardAccounts.length === 0 ? (
                    <div className="rounded-2xl border border-dark-600 bg-dark-800/70 p-3 text-xs text-gray-500">
                      No local signing accounts are available yet.
                    </div>
                  ) : standardAccounts.map((account) => {
                    const checked = linkedSignerAccountIds.includes(account.id)
                    const signerAddress = getAccountAddressForNetwork(account, 'rtm', 'UTXO') || account.addresses?.UTXO || ''
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => toggleLinkedSigner(account.id)}
                        className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                          checked ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-dark-600 bg-dark-800/70 hover:bg-dark-700/70'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-100">
                            {getAccountDisplayName(account, networkId || 'rtm', account.name)}
                          </p>
                          <p className="mt-1 break-all font-mono text-[11px] text-gray-500">
                            {signerAddress || 'RTM address unavailable'}
                          </p>
                        </div>
                        <div className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                          checked ? 'border-emerald-400 bg-emerald-400 text-dark-950' : 'border-dark-500 bg-dark-900'
                        }`}>
                          {checked ? <IoCheckmarkCircle className="h-4 w-4" /> : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              <Input label="Safe address" value={safeAddress} onChange={(event) => setSafeAddress(event.target.value)} placeholder="0x..." className="font-mono text-xs" />
              <label className="space-y-1 text-xs">
                <span className="text-gray-400">Linked owner signer</span>
                <select
                  value={ownerSignerAccountId}
                  onChange={(event) => setOwnerSignerAccountId(event.target.value)}
                  className="w-full rounded-xl border border-dark-600 bg-dark-800 px-3 py-3 text-sm text-gray-100"
                >
                  <option value="">Choose a local owner signer</option>
                  {standardAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {getAccountDisplayName(account, networkId || multisigSettings.defaultNetworkId || '', account.name)} ({getAccountKindLabel(account)})
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {error ? <p className="text-xs font-bold text-red-300">{error}</p> : null}
          <Button onClick={() => void handleImport()} isLoading={busy} disabled={!multisigSettings.enabled || allowedNetworks.length === 0}>
            {multisigSettings.enabled
              ? (
                selectedCapability?.family === 'btc-psbt-v1'
                  ? 'Import Bitcoin multisig'
                  : selectedCapability?.family === 'rtm-utxo-asset-multisig-v1'
                    ? 'Import RTM multisig'
                    : 'Import Safe'
              )
              : 'Enable multisig first'}
          </Button>
        </div>
      </div>

      <div className="wallet-surface space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Managed Accounts</p>
            <p className="mt-1 break-words text-xs text-gray-500">
              {multisigAccounts.length > 0
                ? 'Review imported multisig accounts, signer coverage, and pending Safe proposals.'
                : 'No multisig accounts imported yet.'}
            </p>
          </div>
          {safeMultisigAccounts.length > 0 ? (
            <Button
              variant="outline"
              className="self-start px-3 sm:self-auto"
              onClick={() => void refreshPending().then(() => showToast('Safe proposals refreshed', 'success')).catch((err) => showToast(err instanceof Error ? err.message : String(err), 'error'))}
            >
              <IoRefreshOutline className="mr-2 h-4 w-4" />
              Refresh Safe data
            </Button>
          ) : null}
        </div>

        {multisigAccounts.length === 0 ? (
          <div className="flex gap-3 rounded-2xl border border-dark-600 bg-dark-800/70 p-4">
            <IoInformationCircleOutline className="mt-0.5 h-4.5 w-4.5 shrink-0 text-sky-300" />
            <p className="text-xs leading-relaxed text-gray-300">
              Imported Safe, Bitcoin, and RTM multisig accounts will appear here with their current readiness and actions.
            </p>
          </div>
        ) : multisigAccounts.map((account) => {
          const network = networks.find((candidate) => candidate.id === account.multisig.networkId) || null
          if (isBtcMultisigAccount(account)) {
            const linkedAccounts = account.multisig.linkedSignerAccountIds
              .map((accountId) => accounts.find((candidate) => candidate.id === accountId) || null)
              .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
            const ready = linkedAccounts.length >= account.multisig.threshold
            return (
              <div key={account.id} className="space-y-3 rounded-2xl border border-dark-600 bg-dark-800/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-100">{getAccountDisplayName(account, account.multisig.networkId, account.name)}</p>
                      <span className="rounded-full border border-dark-600 bg-dark-900/80 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-gray-300">
                        BTC PSBT v1
                      </span>
                    </div>
                    <p className="mt-1 break-words text-[11px] text-gray-500">
                      {network?.name || account.multisig.networkId || 'Bitcoin'} | {account.multisig.threshold} of {account.multisig.signers.length}
                    </p>
                  </div>
                  <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                    ready
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                  }`}>
                    {ready ? <IoCheckmarkCircle className="h-3.5 w-3.5" /> : <IoWarningOutline className="h-3.5 w-3.5" />}
                    {ready ? 'Ready' : 'Threshold not met'}
                  </div>
                </div>

                <div className="rounded-xl border border-dark-600 bg-dark-900/70 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Bitcoin multisig address</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-gray-300">
                    {getAccountAddressForNetwork(account, account.multisig.networkId, network?.coinType) || account.multisig.address}
                  </p>
                </div>

                <div className="rounded-xl border border-dark-600 bg-dark-900/70 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Witness script</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-gray-300">
                    {account.multisig.witnessScriptHex}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-dark-600 bg-dark-900/50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Imported signers</p>
                    <div className="mt-2 space-y-1">
                      {account.multisig.signers.map((signer, index) => (
                        <div key={`${signer.pubkey}:${index}`} className="space-y-1">
                          <p className="break-all font-mono text-[11px] text-gray-400">{signer.pubkey}</p>
                          {signer.label ? <p className="text-[11px] text-gray-500">{signer.label}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-dark-600 bg-dark-900/50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Linked local signers</p>
                    <div className="mt-2 space-y-2">
                      {linkedAccounts.length === 0 ? (
                        <p className="text-xs text-gray-500">No linked local BTC signers.</p>
                      ) : linkedAccounts.map((linkedAccount) => (
                        <div key={linkedAccount.id} className="rounded-xl border border-dark-600 bg-dark-900/70 px-3 py-2">
                          <p className="text-xs font-semibold text-gray-200">
                            {getAccountDisplayName(linkedAccount, account.multisig.networkId, linkedAccount.name)}
                          </p>
                          <p className="mt-1 break-all font-mono text-[11px] text-gray-500">
                            {getAccountAddressForNetwork(linkedAccount, account.multisig.networkId, 'UTXO') || linkedAccount.addresses?.BTC || linkedAccount.addresses?.UTXO || 'BTC address unavailable'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-dark-600 bg-dark-900/50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Execution model</p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-300">
                    Bitcoin multisig stays wallet-local in v1. The wallet validates the p2wsh witness script, signs with linked local BTC accounts, finalizes only when the threshold is satisfied, and then relays the fully signed transaction through the existing Bitcoin path.
                  </p>
                </div>
              </div>
            )
          }
          if (isRtmMultisigAccount(account)) {
            const linkedAccounts = account.multisig.linkedSignerAccountIds
              .map((accountId) => accounts.find((candidate) => candidate.id === accountId) || null)
              .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
            const ready = linkedAccounts.length >= account.multisig.threshold
            return (
              <div key={account.id} className="space-y-3 rounded-2xl border border-dark-600 bg-dark-800/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-100">{getAccountDisplayName(account, account.multisig.networkId, account.name)}</p>
                      <span className="rounded-full border border-dark-600 bg-dark-900/80 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-gray-300">
                        RTM Multisig v1
                      </span>
                    </div>
                    <p className="mt-1 break-words text-[11px] text-gray-500">
                      {network?.name || account.multisig.networkId || 'Raptoreum'} | {account.multisig.threshold} of {account.multisig.signers.length}
                    </p>
                  </div>
                  <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                    ready
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                  }`}>
                    {ready ? <IoCheckmarkCircle className="h-3.5 w-3.5" /> : <IoWarningOutline className="h-3.5 w-3.5" />}
                    {ready ? 'Ready' : 'Threshold not met'}
                  </div>
                </div>

                <div className="rounded-xl border border-dark-600 bg-dark-900/70 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">RTM multisig address</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-gray-300">
                    {getAccountAddressForNetwork(account, account.multisig.networkId, network?.coinType) || account.multisig.address}
                  </p>
                </div>

                <div className="rounded-xl border border-dark-600 bg-dark-900/70 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Redeem script</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-gray-300">
                    {account.multisig.redeemScriptHex}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-dark-600 bg-dark-900/50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Imported signers</p>
                    <div className="mt-2 space-y-1">
                      {account.multisig.signers.map((signer, index) => (
                        <div key={`${signer.pubkey}:${index}`} className="space-y-1">
                          <p className="break-all font-mono text-[11px] text-gray-400">{signer.pubkey}</p>
                          {signer.label ? <p className="text-[11px] text-gray-500">{signer.label}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-dark-600 bg-dark-900/50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Linked local signers</p>
                    <div className="mt-2 space-y-2">
                      {linkedAccounts.length === 0 ? (
                        <p className="text-xs text-gray-500">No linked local RTM signers.</p>
                      ) : linkedAccounts.map((linkedAccount) => (
                        <div key={linkedAccount.id} className="rounded-xl border border-dark-600 bg-dark-900/70 px-3 py-2">
                          <p className="text-xs font-semibold text-gray-200">
                            {getAccountDisplayName(linkedAccount, account.multisig.networkId, linkedAccount.name)}
                          </p>
                          <p className="mt-1 break-all font-mono text-[11px] text-gray-500">
                            {getAccountAddressForNetwork(linkedAccount, account.multisig.networkId, 'UTXO') || linkedAccount.addresses?.UTXO || 'RTM address unavailable'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-dark-600 bg-dark-900/50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Execution model</p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-300">
                    RTM multisig stays wallet-local in v1. The wallet validates the script-hash redeem script, signs native RTM and asset transfers with linked local RTM accounts, finalizes only when the threshold is satisfied, and then relays the fully signed transaction through the existing RTM path.
                  </p>
                </div>
              </div>
            )
          }
          if (!isSafeMultisigAccount(account)) return null
          const multisig = account.multisig
          const pending = pendingByAccount[account.id] || []
          const owners = multisig.owners
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
                    ) : owners.map((owner: string) => (
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
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Cross-family Status</p>
            <p className="mt-1 break-words text-xs text-gray-500">
              Multisig execution stays scoped to imported Safe accounts on supported EVM chains, imported Bitcoin p2wsh multisig on Bitcoin, and imported RTM script-hash multisig on Raptoreum. Cross-chain and BTCZ multisig flows are not executable in this build.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MultisigSettings
