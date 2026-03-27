import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ethers } from 'ethers'
import {
  IoAlertCircleOutline,
  IoCheckmarkCircle,
  IoCopyOutline,
  IoDownloadOutline,
  IoEyeOffOutline,
  IoEyeOutline,
  IoLayersOutline,
  IoPersonOutline,
  IoShieldCheckmarkOutline,
  IoSwapHorizontalOutline,
  IoTimeOutline
} from 'react-icons/io5'
import { Button } from '../../components/Button'
import { PasswordGate } from '../../components/PasswordGate'
import { useToast } from '../../components/Toast'
import { getAccountDisplayName } from '../../lib/accountName'
import { deriveCosmosAddress, resolveCosmosAddressConfig } from '../../lib/cosmosAddress'
import { resolveRuntimeModelId } from '../../lib/runtimeModel'
import { deriveSuiAddress } from '../../lib/suiAddress'
import { deriveUtxoAddress } from '../../lib/utxoAddress'
import { useWalletStore, type FullBackupV2 } from '../../store/walletStore'

type BackupTab = 'full' | 'secrets'

function downloadJSON(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

const BackupSettings: React.FC = () => {
  const {
    vault,
    setBackupConfirmed,
    sessionMnemonic,
    accounts,
    activeAccountId,
    activeNetworkId,
    activity,
    authorizedSites,
    autolockMinutes,
    donationPercent,
    backupConfirmed,
    onboardingCompleted,
    acceptedTermsVersion,
    acceptedTermsAt,
    networkAssets,
    sendListPreferences,
    networkModelPreferences,
    multisigSettings,
    nextAccountIndex,
    createdAt,
    networks
  } = useWalletStore()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showPhrase, setShowPhrase] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [copiedPhrase, setCopiedPhrase] = useState(false)
  const [copiedPrivateKey, setCopiedPrivateKey] = useState(false)
  const [fullDownloaded, setFullDownloaded] = useState(false)
  const [keysDownloaded, setKeysDownloaded] = useState(false)
  const [derivedPrivateKey, setDerivedPrivateKey] = useState('')

  const mnemonic = sessionMnemonic ?? ''
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || accounts[0]
  const activeNetwork = networks.find((network) => network.id === activeNetworkId) || networks[0]
  const activeAccountName = getAccountDisplayName(activeAccount, activeNetworkId, 'Account')
  const activeAddress = String(
    activeAccount?.networkAddresses?.[activeNetworkId]
    || activeAccount?.addresses?.[activeNetwork?.coinType ?? 'EVM']
    || ''
  ).trim()
  const backupTab: BackupTab = searchParams.get('tab') === 'secrets' ? 'secrets' : 'full'

  const accountListIndex = useMemo(
    () => accounts.findIndex((account) => account.id === activeAccount?.id),
    [accounts, activeAccount]
  )

  const derivationIndex = useMemo(() => {
    if (!activeAccount) return 0
    if (typeof activeAccount.derivationIndex === 'number' && activeAccount.derivationIndex >= 0) {
      return activeAccount.derivationIndex
    }
    return accountListIndex >= 0 ? accountListIndex : 0
  }, [activeAccount, accountListIndex])

  useEffect(() => {
    let cancelled = false

    const deriveSelectedPrivateKey = async () => {
      if (!mnemonic || !activeNetwork) {
        if (!cancelled) setDerivedPrivateKey('')
        return
      }

      try {
        const modelId = resolveRuntimeModelId(activeNetwork)
        if (activeNetwork.coinType === 'EVM') {
          const path = `m/44'/60'/${derivationIndex}'/0/0`
          const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path)
          if (!cancelled) setDerivedPrivateKey(wallet.privateKey)
          return
        }

        if (modelId === 'cosmos' || modelId === 'cro' || modelId === 'crocosmos') {
          const cosmosCfg = resolveCosmosAddressConfig({
            runtimeModelId: activeNetwork.runtimeModelId,
            serverCoinId: activeNetwork.serverCoinId,
            id: activeNetwork.id
          })
          const derived = await deriveCosmosAddress(mnemonic, derivationIndex, cosmosCfg)
          if (!cancelled) setDerivedPrivateKey(derived.privHex)
          return
        }

        if (modelId === 'sui') {
          const derived = await deriveSuiAddress(mnemonic, derivationIndex)
          if (!cancelled) setDerivedPrivateKey(derived.privHex)
          return
        }

        if (activeNetwork.coinType === 'UTXO' && activeNetwork.coinSymbol) {
          const derived = await deriveUtxoAddress(mnemonic, activeNetwork.coinSymbol, derivationIndex, 0, 0)
          if (!cancelled) setDerivedPrivateKey(derived.privHex)
          return
        }

        if (!cancelled) setDerivedPrivateKey('')
      } catch {
        if (!cancelled) setDerivedPrivateKey('')
      }
    }

    void deriveSelectedPrivateKey()
    return () => {
      cancelled = true
    }
  }, [activeNetwork, derivationIndex, mnemonic])

  const selectTab = (nextTab: BackupTab) => {
    const nextParams = new URLSearchParams(searchParams)
    if (nextTab === 'full') {
      nextParams.delete('tab')
    } else {
      nextParams.set('tab', nextTab)
    }
    setSearchParams(nextParams, { replace: true })
  }

  const copyText = (text: string, successMessage: string, onCopied?: () => void) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    onCopied?.()
    showToast(successMessage, 'success')
  }

  const handleRevealSecrets = () => {
    setShowPhrase(true)
    setBackupConfirmed(true)
  }

  const handleCopyPhrase = () => {
    copyText(mnemonic, 'Recovery phrase copied', () => {
      setCopiedPhrase(true)
      window.setTimeout(() => setCopiedPhrase(false), 2000)
    })
  }

  const handleCopyPrivateKey = () => {
    copyText(derivedPrivateKey, 'Private key copied', () => {
      setCopiedPrivateKey(true)
      window.setTimeout(() => setCopiedPrivateKey(false), 2000)
    })
  }

  const handleDownloadVault = () => {
    if (!vault) return
    const payload = {
      type: 'metayoshi-vault',
      v: 1,
      createdAt: Date.now(),
      vault
    }
    downloadJSON(payload, `metayoshi-vault-${Date.now()}.json`)
    showToast('Encrypted vault downloaded', 'success')
  }

  const handleDownloadKeys = () => {
    const keysData = {
      mnemonic,
      privateKey: derivedPrivateKey || null,
      networkId: activeNetwork?.id || '',
      networkSymbol: activeNetwork?.symbol || '',
      accountName: activeAccountName,
      activeAddress,
      timestamp: new Date().toISOString(),
      warning: 'Never share these secrets. Anyone with them can control your wallet.'
    }

    downloadJSON(keysData, `metayoshi-wallet-secrets-${Date.now()}.json`)
    setKeysDownloaded(true)
    showToast('Wallet secrets downloaded', 'success')
  }

  const handleCopyAllSecrets = () => {
    const content = [
      'MetaYoshi Wallet Secrets',
      '',
      `Recovery Phrase: ${mnemonic || 'Unavailable'}`,
      `Private Key (${activeNetwork?.symbol || 'Unknown'} / ${activeAccountName}): ${derivedPrivateKey || 'Unavailable'}`,
      `Active Address: ${activeAddress || 'Unavailable'}`,
      '',
      `Exported: ${new Date().toISOString()}`,
      '',
      'Warning: Never share these secrets.'
    ].join('\n')

    copyText(content, 'Recovery phrase and private key copied')
  }

  const handleFullBackup = () => {
    if (!vault) {
      showToast('No vault found', 'error')
      return
    }

    const backup: FullBackupV2 = {
      type: 'metayoshi-full-backup',
      version: 2,
      createdAt: createdAt ?? Date.now(),
      vault,
      accounts,
      nextAccountIndex: nextAccountIndex ?? accounts.length,
      activeAccountId,
      activeNetworkId,
      activity,
      authorizedSites,
      autolockMinutes,
      donationPercent,
      backupConfirmed,
      onboardingCompleted,
      acceptedTermsVersion,
      acceptedTermsAt,
      networkAssets,
      sendListPreferences,
      networkModelPreferences,
      multisigSettings
    }

    downloadJSON(backup, `metayoshi-fullbackup-${Date.now()}.json`)
    setFullDownloaded(true)
    setBackupConfirmed(true)
    showToast('Full backup downloaded', 'success')
  }

  return (
    <PasswordGate
      title="Backup Wallet"
      description="Enter your password to manage backups, recovery phrase, and private key export."
    >
      <div className="flex h-full flex-col overflow-y-auto bg-dark-800 custom-scrollbar">
        <div className="flex flex-col items-center gap-4 px-8 pb-6 pt-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-gradient-to-b from-primary/35 to-primary/10 shadow-[0_0_18px_rgba(245,132,31,0.24)]">
            <img src="/MetayoshiLogo.png" alt="MetaYoshi" className="h-full w-full scale-[1.12] object-contain object-center translate-y-[2px]" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-widest">Backup Wallet</h2>
            <p className="mt-1 text-xs text-gray-500">One place for backup files, recovery phrase, and private keys.</p>
          </div>
        </div>

        <div className="mb-5 px-5">
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-dark-600 bg-dark-700/40 p-1">
            <button
              type="button"
              onClick={() => selectTab('full')}
              className={`rounded-lg py-2 text-xs font-bold transition-colors ${
                backupTab === 'full' ? 'bg-primary text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Full Backup
            </button>
            <button
              type="button"
              onClick={() => selectTab('secrets')}
              className={`rounded-lg py-2 text-xs font-bold transition-colors ${
                backupTab === 'secrets' ? 'bg-primary text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Phrase and Keys
            </button>
          </div>
        </div>

        {backupTab === 'full' ? (
          <div className="space-y-4 px-5 pb-8">
            <div className="overflow-hidden rounded-xl border border-dark-600 bg-dark-700/30">
              <div className="border-b border-dark-600/50 px-4 pb-2 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  What is included in this backup
                </p>
              </div>
              <div className="divide-y divide-dark-600/30">
                <BackupRow
                  icon={<IoShieldCheckmarkOutline className="h-4 w-4 text-primary" />}
                  label="Encrypted Vault"
                  value="Password-protected mnemonic"
                />
                <BackupRow
                  icon={<IoPersonOutline className="h-4 w-4 text-yellow-400" />}
                  label="Accounts"
                  value={`${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
                />
                <BackupRow
                  icon={<IoSwapHorizontalOutline className="h-4 w-4 text-blue-400" />}
                  label="Transaction History"
                  value={`${activity.length} record${activity.length === 1 ? '' : 's'}`}
                />
                <BackupRow
                  icon={<IoLayersOutline className="h-4 w-4 text-green-400" />}
                  label="Asset Balances"
                  value={`${Object.values(networkAssets).reduce((sum, assets) => sum + Object.keys(assets).length, 0)} cached`}
                />
                <BackupRow
                  icon={<IoTimeOutline className="h-4 w-4 text-gray-400" />}
                  label="Settings"
                  value={`Autolock ${autolockMinutes}min, ${authorizedSites.length} site${authorizedSites.length === 1 ? '' : 's'}`}
                />
              </div>
            </div>

            {accounts.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-dark-600 bg-dark-700/30">
                <div className="border-b border-dark-600/50 px-4 pb-2 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Accounts included
                  </p>
                </div>
                {accounts.map((account) => {
                  const isActive = account.id === activeAccountId
                  const addressCount = Object.keys(account.networkAddresses ?? {}).length
                  return (
                    <div key={account.id} className="flex items-center gap-3 border-b border-dark-600/30 px-4 py-3 last:border-0">
                      <div className={`h-7 w-7 shrink-0 rounded-full bg-gradient-to-tr from-blue-600 to-yellow-400 ${isActive ? 'ring-2 ring-primary' : ''}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-200">{account.name}</p>
                        <p className="text-[10px] text-gray-500">{addressCount} network address{addressCount === 1 ? '' : 'es'}</p>
                      </div>
                      {isActive ? (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">Active</span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : null}

            <div className="flex gap-2.5 rounded-xl border border-yellow-500/20 bg-yellow-900/10 p-3">
              <span className="shrink-0 text-base text-yellow-400">!</span>
              <p className="text-[10px] leading-relaxed text-yellow-300/80">
                This backup is encrypted with your current wallet password. You need the same password to restore it.
                Store the file and the password separately.
              </p>
            </div>

            <Button className="btn-primary flex w-full items-center justify-center gap-2" onClick={handleFullBackup}>
              <IoDownloadOutline className="h-5 w-5" />
              Download Full Backup
            </Button>

            {fullDownloaded ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-green-500/30 bg-green-900/20 p-3">
                <IoCheckmarkCircle className="h-5 w-5 shrink-0 text-green-400" />
                <p className="text-xs font-bold text-green-300">Full backup downloaded. Keep it offline and secure.</p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-5 px-5 pb-8">
            <div className="flex gap-3 rounded-xl border border-red-500/30 bg-red-900/20 p-4">
              <IoAlertCircleOutline className="mt-0.5 h-6 w-6 shrink-0 text-red-500" />
              <p className="text-[11px] font-bold uppercase leading-normal tracking-tight text-red-200">
                Recovery phrase and private keys give full access to your funds. Never share them and avoid storing them in cloud notes or chat apps.
              </p>
            </div>

            <div className="rounded-xl border border-dark-600 bg-dark-700/30 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Current export scope</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400">Account</span>
                  <span className="text-xs font-bold text-gray-200">{activeAccountName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400">Network</span>
                  <span className="text-xs font-bold text-gray-200">{activeNetwork?.name || 'Unavailable'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-gray-400">Active address</span>
                  <p className="break-all rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 font-mono text-[11px] text-gray-300">
                    {activeAddress || 'Unavailable for the selected account and network'}
                  </p>
                </div>
              </div>
            </div>

            {!showPhrase ? (
              <Button className="btn-primary w-full" onClick={handleRevealSecrets}>
                Reveal Recovery Phrase and Private Key
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button variant="outline" className="flex-1" onClick={handleDownloadVault}>
                    <IoDownloadOutline className="mr-2 h-4 w-4" />
                    Download Encrypted Vault
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleDownloadKeys}>
                    <IoDownloadOutline className="mr-2 h-4 w-4" />
                    Download Phrase and Key
                  </Button>
                </div>

                <div className="space-y-3 rounded-xl border border-dark-600 bg-dark-900 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Secret Recovery Phrase
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyPhrase}
                      className="flex items-center gap-1.5 rounded-lg bg-dark-700 px-2 py-1 transition-colors hover:bg-dark-600"
                    >
                      {copiedPhrase ? (
                        <>
                          <IoCheckmarkCircle className="h-3.5 w-3.5 text-green-400" />
                          <span className="text-[10px] font-bold text-green-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <IoCopyOutline className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-[10px] font-bold text-gray-400">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {mnemonic.split(' ').filter(Boolean).map((word, index) => (
                      <div
                        key={`${word}-${index}`}
                        className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-800 px-2 py-2"
                      >
                        <span className="w-4 shrink-0 text-right text-[10px] font-bold text-gray-600">{index + 1}</span>
                        <span className="text-xs font-bold text-gray-200">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-dark-600 bg-dark-900 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Private Key ({activeNetwork?.symbol || 'Unknown'} / {activeAccountName})
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPrivateKey((current) => !current)}
                        className="rounded-lg bg-dark-700 p-1.5 text-gray-400 transition-colors hover:text-white"
                      >
                        {showPrivateKey ? <IoEyeOffOutline className="h-4 w-4" /> : <IoEyeOutline className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyPrivateKey}
                        disabled={!derivedPrivateKey}
                        className="rounded-lg bg-dark-700 p-1.5 text-gray-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {copiedPrivateKey ? <IoCheckmarkCircle className="h-4 w-4 text-green-400" /> : <IoCopyOutline className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex min-h-[72px] items-center rounded-xl border border-dark-600 bg-dark-800 p-4 font-mono text-xs break-all text-gray-200">
                    {showPrivateKey
                      ? (derivedPrivateKey || 'Unavailable for the selected account and network')
                      : '****************************************************************'}
                  </div>
                </div>

                <Button variant="outline" className="flex w-full items-center justify-center gap-2" onClick={handleCopyAllSecrets}>
                  <IoCopyOutline className="h-5 w-5" />
                  Copy Phrase and Private Key
                </Button>

                <div className="flex gap-2.5 rounded-xl border border-yellow-500/20 bg-yellow-900/10 p-3">
                  <span className="shrink-0 text-base text-yellow-400">i</span>
                  <p className="text-[10px] leading-relaxed text-yellow-300/80">
                    The recovery phrase restores the whole wallet. The private key shown here is only for the active account and active network.
                    Switch account or network first if you need a different key.
                  </p>
                </div>
              </div>
            )}

            {keysDownloaded ? (
              <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-900/20 p-3">
                <IoCheckmarkCircle className="h-5 w-5 shrink-0 text-green-500" />
                <p className="text-xs font-bold text-green-200">Phrase and private key export downloaded. Keep the file secure.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </PasswordGate>
  )
}

interface BackupRowProps {
  icon: React.ReactNode
  label: string
  value: string
}

const BackupRow: React.FC<BackupRowProps> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 px-4 py-3">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dark-700/50">
      {icon}
    </div>
    <span className="flex-1 text-xs font-bold text-gray-300">{label}</span>
    <span className="text-[10px] font-bold text-gray-500">{value}</span>
  </div>
)

export default BackupSettings
