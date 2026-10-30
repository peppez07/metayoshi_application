import React, { useState } from 'react'
import { PasswordGate } from '../../components/PasswordGate'
import { Button } from '../../components/Button'
import { IoDownloadOutline, IoCopyOutline, IoCheckmarkCircle } from 'react-icons/io5'
import { useToast } from '../../components/Toast'
import { useWalletStore } from '../../store/walletStore'
import { useAccountKey } from '../../lib/useAccountKey'

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-4 bg-dark-900 rounded-xl border border-dark-600 space-y-2">
    <span className="text-xs font-bold text-gray-400 uppercase">{label}</span>
    <p className="text-xs font-mono text-gray-300 break-all">{value || '—'}</p>
  </div>
)

const DownloadKeys: React.FC = () => {
  const { sessionMnemonic, accounts } = useWalletStore()
  const key = useAccountKey()
  const [downloaded, setDownloaded] = useState(false)
  const { showToast } = useToast()
  const mnemonic = sessionMnemonic ?? ''

  const exportData = () => ({
    coin: 'RTM',
    mnemonic,
    account: key ? { name: key.accountName, address: key.address, path: key.path, privateKeyWif: key.wif, publicKey: key.publicKey } : null,
    accounts: accounts.map((a) => ({ name: a.name, address: a.address, derivationIndex: a.derivationIndex })),
    timestamp: new Date().toISOString(),
    warning: 'NEVER share these keys with anyone. Keep this file secure.'
  })

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `metayoshi-rtm-keys-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDownloaded(true)
    showToast('Keys downloaded successfully', 'success')
  }

  const handleCopyAll = () => {
    void navigator.clipboard.writeText(JSON.stringify(exportData(), null, 2))
    showToast('All keys copied to clipboard', 'success')
  }

  return (
    <PasswordGate title="Download Keys" description="Enter password to download your wallet keys.">
      <div className="flex flex-col h-full bg-dark-800 p-6 space-y-6 overflow-y-auto custom-scrollbar">
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
          <p className="text-[11px] font-bold text-red-200 leading-normal uppercase tracking-tight text-center">
            Keep this file secure. Anyone with access to these keys can control your wallet.
          </p>
        </div>

        <div className="space-y-4">
          <Field label={`Mnemonic phrase · ${mnemonic.split(' ').filter(Boolean).length} words`} value={mnemonic} />
          <Field label={`Private key (WIF · ${key?.accountName ?? 'Account'})`} value={key?.wif ?? ''} />
          <Field label="Public key" value={key?.publicKey ?? ''} />
          <Field label={`Address · ${key?.path ?? ''}`} value={key?.address ?? ''} />
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button className="w-full btn-primary" onClick={handleDownload} disabled={!key}>
            <IoDownloadOutline className="w-5 h-5" /> Download Keys as JSON
          </Button>
          <Button variant="outline" className="w-full" onClick={handleCopyAll} disabled={!key}>
            <IoCopyOutline className="w-5 h-5" /> Copy All to Clipboard
          </Button>
        </div>

        {downloaded && (
          <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-xl flex items-center gap-2">
            <IoCheckmarkCircle className="text-green-500 w-5 h-5 flex-shrink-0" />
            <p className="text-xs font-bold text-green-200">Keys downloaded successfully. Keep the file secure!</p>
          </div>
        )}
      </div>
    </PasswordGate>
  )
}

export default DownloadKeys
