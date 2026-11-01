import React, { useState } from 'react'
import { PasswordGate } from '../../components/PasswordGate'
import { useWalletStore } from '../../store/walletStore'
import { IoCopyOutline, IoEyeOutline, IoEyeOffOutline, IoAlertCircleOutline } from 'react-icons/io5'
import { useToast } from '../../components/Toast'
import { useAccountKey } from '../../lib/useAccountKey'

const SecretBlock: React.FC<{ title: string; value: string; shown: boolean; onToggle: () => void; onCopy: () => void; children: React.ReactNode }> = ({
  title, shown, onToggle, onCopy, children
}) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
      <div className="flex gap-2">
        <button onClick={onToggle} className="p-1.5 bg-dark-700 rounded-lg text-gray-400 hover:text-white transition-colors">
          {shown ? <IoEyeOffOutline className="w-4 h-4" /> : <IoEyeOutline className="w-4 h-4" />}
        </button>
        <button onClick={onCopy} className="p-1.5 bg-dark-700 rounded-lg text-gray-400 hover:text-white transition-colors">
          <IoCopyOutline className="w-4 h-4" />
        </button>
      </div>
    </div>
    {children}
  </div>
)

const ShowSecrets: React.FC = () => {
  const { sessionMnemonic } = useWalletStore()
  const key = useAccountKey()
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [showPrivKey, setShowPrivKey] = useState(false)
  const { showToast } = useToast()
  const mnemonic = sessionMnemonic ?? ''

  const copy = (text: string) => {
    if (!text) return
    void navigator.clipboard.writeText(text)
    showToast('Copied to clipboard', 'success')
  }

  return (
    <PasswordGate title="Show Secrets" description="Enter password to reveal your secret recovery phrase and private key.">
      <div className="flex flex-col h-full bg-dark-800 p-6 space-y-8 overflow-y-auto custom-scrollbar">
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3">
          <IoAlertCircleOutline className="text-red-500 w-6 h-6 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-red-200 leading-normal uppercase tracking-tight">
            Never share your secret recovery phrase or private key. Anyone with these secrets can take your funds forever.
          </p>
        </div>

        <SecretBlock title="Secret Recovery Phrase" value={mnemonic} shown={showMnemonic} onToggle={() => setShowMnemonic(!showMnemonic)} onCopy={() => copy(mnemonic)}>
          <div className="p-4 bg-dark-900 rounded-xl border border-dark-600 min-h-[100px] flex items-center justify-center">
            {showMnemonic ? (
              <p className="text-sm font-bold text-center leading-relaxed font-mono">{mnemonic}</p>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1 flex-wrap justify-center blur-sm select-none">
                  {mnemonic.split(' ').map((w, i) => <span key={i} className="px-2 py-1 bg-dark-700 rounded text-[10px]">{w}</span>)}
                </div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hidden</p>
              </div>
            )}
          </div>
        </SecretBlock>

        <SecretBlock
          title={`${key?.symbol ?? ''} private key (WIF · ${key?.accountName ?? 'Account'})`.trim()}
          value={key?.wif ?? ''}
          shown={showPrivKey}
          onToggle={() => setShowPrivKey(!showPrivKey)}
          onCopy={() => copy(key?.wif ?? '')}
        >
          <div className="p-4 bg-dark-900 rounded-xl border border-dark-600 font-mono text-xs break-all min-h-[60px] flex flex-col items-center justify-center gap-1">
            <span>{showPrivKey ? (key?.wif || 'Unavailable') : '•'.repeat(52)}</span>
            {key && <span className="text-[10px] text-gray-500">{key.path} · {key.address}</span>}
          </div>
        </SecretBlock>
      </div>
    </PasswordGate>
  )
}

export default ShowSecrets
