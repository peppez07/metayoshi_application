import React, { useState } from 'react'
import { IoCheckmarkCircle, IoTrashOutline } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { isValidServerUrl } from '../../lib/electrum/rtmElectrum'
import { useWalletStore } from '../../store/walletStore'

const ServerSettings: React.FC = () => {
  const { servers, activeServer, connection, connectionError, serverVersion, assetsReady, tipHeight, addServer, removeServer, setActiveServer } = useWalletStore()
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const use = async (server: string) => {
    setBusy(server)
    try {
      await setActiveServer(server)
    } finally {
      setBusy('')
    }
  }

  const add = () => {
    setError('')
    const value = url.trim()
    if (!isValidServerUrl(value)) {
      setError('Use a WebSocket URL such as wss://host:50004')
      return
    }
    addServer(value)
    setUrl('')
  }

  return (
    <div className="p-4 space-y-5">
      <div className="p-4 rounded-xl border border-dark-600 bg-dark-700/40 space-y-1">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Current connection</p>
        <p className="text-xs font-mono break-all text-gray-200">{activeServer}</p>
        <p className={`text-xs font-bold ${connection === 'connected' ? 'text-green-400' : connection === 'connecting' ? 'text-yellow-300' : 'text-red-400'}`}>
          {connection === 'connected' ? `Connected · block ${tipHeight.toLocaleString()}` : connection === 'connecting' ? 'Connecting…' : 'Not connected'}
        </p>
        {connection === 'connected' && (
          <p className="text-[10px] text-gray-500">{serverVersion} · asset index {assetsReady ? 'ready' : 'synchronizing'}</p>
        )}
        {connection === 'error' && connectionError && (
          <p className="text-[10px] text-red-300 whitespace-pre-line break-all">{connectionError}</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Servers</p>
        {servers.map((server) => (
          <div key={server} className={`flex items-center justify-between p-3 rounded-xl border ${server === activeServer ? 'border-primary bg-primary/5' : 'border-dark-600 bg-dark-700/40'}`}>
            <button className="flex items-center gap-2 min-w-0 text-left flex-1" onClick={() => void use(server)} disabled={!!busy}>
              {server === activeServer && <IoCheckmarkCircle className="w-4 h-4 text-primary shrink-0" />}
              <span className="text-[11px] font-mono break-all">{server}</span>
              {busy === server && <span className="text-[10px] text-gray-400">connecting…</span>}
            </button>
            <button className="p-1.5 rounded-lg hover:bg-dark-600" onClick={() => removeServer(server)} title="Remove">
              <IoTrashOutline className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Input placeholder="wss://host:50004" value={url} onChange={(e) => setUrl(e.target.value)} error={error} className="bg-dark-700/50 border-dark-600 font-mono text-xs" />
        <Button variant="outline" className="w-full" onClick={add} disabled={!url.trim()}>Add server</Button>
      </div>

      <div className="space-y-2 text-[10px] leading-relaxed text-gray-500">
        <p>
          The wallet only reads public chain data from ElectrumX and broadcasts transactions it has already signed.
          Keys never leave this browser. Every server is checked to be a Raptoreum mainnet server before use.
        </p>
        <p>
          Browsers only allow WebSocket connections. A <span className="font-mono">wss://</span> server needs a TLS certificate the
          browser trusts; for a self-signed test certificate, open the same host and port with https:// once and accept it.
          <span className="font-mono"> ws://</span> is unencrypted and meant for testing only.
        </p>
      </div>
    </div>
  )
}

export default ServerSettings
