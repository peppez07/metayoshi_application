import React, { useEffect, useMemo, useState } from 'react'
import { PasswordGate } from '../../components/PasswordGate'
import { useWalletStore } from '../../store/walletStore'
import { Button } from '../../components/Button'
import { IoDownloadOutline, IoCopyOutline, IoCheckmarkCircle } from 'react-icons/io5'
import { useToast } from '../../components/Toast'
import { ethers } from 'ethers'
import { deriveUtxoAddress } from '../../lib/utxoAddress'
import { getAccountDisplayName } from '../../lib/accountName'

const DownloadKeys: React.FC = () => {
  const { sessionMnemonic, accounts, activeAccountId, networks, activeNetworkId } = useWalletStore()
  const [downloaded, setDownloaded] = useState(false)
  const [derivedPrivKey, setDerivedPrivKey] = useState('')
  const { showToast } = useToast()
  const decryptedMnemonic = sessionMnemonic ?? ''
  
  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0]
  const activeNetwork = networks.find((n) => n.id === activeNetworkId) || networks[0]
  const activeAccountName = getAccountDisplayName(activeAccount, activeNetworkId, 'Account')
  const accountListIndex = useMemo(
    () => accounts.findIndex((a) => a.id === activeAccount?.id),
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

    const deriveSelectedKey = async () => {
      if (!decryptedMnemonic || !activeNetwork) {
        if (!cancelled) setDerivedPrivKey('')
        return
      }

      try {
        if (activeNetwork.coinType === 'EVM') {
          const path = `m/44'/60'/${derivationIndex}'/0/0`
          const wallet = ethers.HDNodeWallet.fromPhrase(decryptedMnemonic, undefined, path)
          if (!cancelled) setDerivedPrivKey(wallet.privateKey)
          return
        }

        if (activeNetwork.coinType === 'UTXO' && activeNetwork.coinSymbol) {
          const derived = await deriveUtxoAddress(decryptedMnemonic, activeNetwork.coinSymbol, derivationIndex, 0, 0)
          if (!cancelled) setDerivedPrivKey(derived.privHex)
          return
        }

        if (!cancelled) setDerivedPrivKey('')
      } catch {
        if (!cancelled) setDerivedPrivKey('')
      }
    }

    void deriveSelectedKey()
    return () => { cancelled = true }
  }, [activeNetwork, decryptedMnemonic, derivationIndex])

  const publicKey = activeAccount?.addresses.EVM || ''
  const privateKeyLabel = activeNetwork
    ? `Private Key (${activeNetwork.symbol} · ${activeAccountName})`
    : 'Private Key'

  const handleDownload = () => {
    const keysData = {
      mnemonic: decryptedMnemonic,
      privateKey: derivedPrivKey,
      privateKeyNetwork: activeNetwork?.symbol || '',
      privateKeyAccount: activeAccountName,
      publicKey: publicKey,
      accounts: accounts.map(acc => ({
        name: acc.name,
        addresses: acc.addresses
      })),
      timestamp: new Date().toISOString(),
      warning: 'NEVER share these keys with anyone. Keep this file secure.'
    }

    const blob = new Blob([JSON.stringify(keysData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `metayoshi-keys-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setDownloaded(true)
    showToast('Keys downloaded successfully', 'success')
  }

  const handleCopyAll = () => {
    const keysText = `MetaYoshi Wallet Keys\n\n` +
      `Mnemonic: ${decryptedMnemonic}\n` +
      `${privateKeyLabel}: ${derivedPrivKey}\n` +
      `Public Key (EVM): ${publicKey}\n\n` +
      `Downloaded: ${new Date().toISOString()}\n\n` +
      `WARNING: NEVER share these keys with anyone!`

    navigator.clipboard.writeText(keysText)
    showToast('All keys copied to clipboard', 'success')
  }

  return (
    <PasswordGate 
      title="Download Keys"
      description="Enter password to download your wallet keys."
    >
      <div className="flex flex-col h-full bg-dark-800 p-6 space-y-6 overflow-y-auto custom-scrollbar">
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
          <p className="text-[11px] font-bold text-red-200 leading-normal uppercase tracking-tight text-center">
            ⚠️ Keep this file secure. Anyone with access to these keys can control your wallet.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-dark-900 rounded-xl border border-dark-600 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase">Mnemonic Phrase</span>
              <span className="text-[10px] text-gray-500 font-mono">{decryptedMnemonic.split(' ').length} words</span>
            </div>
            <p className="text-xs font-mono text-gray-300 break-all">{decryptedMnemonic}</p>
          </div>

          <div className="p-4 bg-dark-900 rounded-xl border border-dark-600 space-y-3">
            <span className="text-xs font-bold text-gray-400 uppercase">{privateKeyLabel}</span>
            <p className="text-xs font-mono text-gray-300 break-all">{derivedPrivKey || 'Unavailable for selected account/network'}</p>
          </div>

          <div className="p-4 bg-dark-900 rounded-xl border border-dark-600 space-y-3">
            <span className="text-xs font-bold text-gray-400 uppercase">Public Key (EVM)</span>
            <p className="text-xs font-mono text-gray-300 break-all">{publicKey}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button 
            className="w-full btn-primary flex items-center justify-center gap-2"
            onClick={handleDownload}
          >
            <IoDownloadOutline className="w-5 h-5" />
            Download Keys as JSON
          </Button>
          <Button 
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleCopyAll}
          >
            <IoCopyOutline className="w-5 h-5" />
            Copy All to Clipboard
          </Button>
        </div>

        {downloaded && (
          <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-xl flex items-center gap-2">
            <IoCheckmarkCircle className="text-green-500 w-5 h-5 flex-shrink-0" />
            <p className="text-xs font-bold text-green-200">
              Keys downloaded successfully. Keep the file secure!
            </p>
          </div>
        )}
      </div>
    </PasswordGate>
  )
}

export default DownloadKeys
