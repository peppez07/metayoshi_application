import React, { useEffect, useMemo, useState } from 'react'
import { PasswordGate } from '../../components/PasswordGate'
import { useWalletStore } from '../../store/walletStore'
import { IoCopyOutline, IoEyeOutline, IoEyeOffOutline, IoAlertCircleOutline } from 'react-icons/io5'
import { useToast } from '../../components/Toast'
import { ethers } from 'ethers'
import { deriveUtxoAddress } from '../../lib/utxoAddress'
import { getAccountDisplayName } from '../../lib/accountName'

const ShowSecrets: React.FC = () => {
  const { sessionMnemonic, accounts, activeAccountId, networks, activeNetworkId } = useWalletStore()
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [showPrivKey, setShowPrivKey] = useState(false)
  const [derivedPrivKey, setDerivedPrivKey] = useState('')
  const { showToast } = useToast()

  const decryptedMnemonic = sessionMnemonic ?? ''
  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0]
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

  const privateKeyLabel = activeNetwork
    ? `Private Key (${activeNetwork.symbol} · ${activeAccountName})`
    : 'Private Key'

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    showToast('Copied to clipboard', 'success')
  }

  return (
    <PasswordGate 
      title="Show Secrets"
      description="Enter password to reveal your secret recovery phrase and private key."
    >
      <div className="flex flex-col h-full bg-dark-800 p-6 space-y-8 overflow-y-auto custom-scrollbar">
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3">
          <IoAlertCircleOutline className="text-red-500 w-6 h-6 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-red-200 leading-normal uppercase tracking-tight">
            Never share your secret recovery phrase or private key. Anyone with these secrets can take your funds forever.
          </p>
        </div>

        <div className="space-y-4">
           <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Secret Recovery Phrase</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowMnemonic(!showMnemonic)}
                  className="p-1.5 bg-dark-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  {showMnemonic ? <IoEyeOffOutline className="w-4 h-4" /> : <IoEyeOutline className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => copyToClipboard(decryptedMnemonic)}
                  className="p-1.5 bg-dark-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <IoCopyOutline className="w-4 h-4" />
                </button>
              </div>
           </div>
           
           <div className="p-4 bg-dark-900 rounded-xl border border-dark-600 relative overflow-hidden min-h-[100px] flex items-center justify-center">
              {showMnemonic ? (
                <p className="text-sm font-bold text-center leading-relaxed font-mono">
                  {decryptedMnemonic}
                </p>
              ) : (
                <div className="flex flex-col items-center gap-2">
                   <div className="flex gap-1 flex-wrap justify-center blur-sm select-none">
                      {decryptedMnemonic.split(' ').map((w, i) => (
                        <span key={i} className="px-2 py-1 bg-dark-700 rounded text-[10px]">{w}</span>
                      ))}
                   </div>
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hidden</p>
                </div>
              )}
           </div>
        </div>

        <div className="space-y-4">
           <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{privateKeyLabel}</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowPrivKey(!showPrivKey)}
                  className="p-1.5 bg-dark-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  {showPrivKey ? <IoEyeOffOutline className="w-4 h-4" /> : <IoEyeOutline className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => copyToClipboard(derivedPrivKey)}
                  className="p-1.5 bg-dark-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <IoCopyOutline className="w-4 h-4" />
                </button>
              </div>
           </div>
           
           <div className="p-4 bg-dark-900 rounded-xl border border-dark-600 font-mono text-xs break-all min-h-[60px] flex items-center justify-center">
              {showPrivKey ? (derivedPrivKey || 'Unavailable for selected account/network') : '****************************************************************'}
           </div>
        </div>
      </div>
    </PasswordGate>
  )
}

export default ShowSecrets
