import React, { useState } from 'react'
import { IoCheckmarkCircle, IoTrashOutline } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { IconButton, Notice } from '../../components/ui'
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

  const certificatePage = activeServer.startsWith('wss://') ? activeServer.replace(/^wss:/, 'https:') : ''
  const statusTone = connection === 'connected' ? 'text-success' : connection === 'connecting' ? 'text-warning' : 'text-danger'

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="card px-4 py-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Current connection</span>
          <span className={`flex items-center gap-1.5 text-xs font-semibold ${statusTone}`}>
            <span className={`status-dot ${connection === 'connected' ? 'status-dot-green' : connection === 'connecting' ? 'status-dot-yellow' : 'status-dot-red'}`} />
            {connection === 'connected' ? `Block ${tipHeight.toLocaleString('en-US')}` : connection === 'connecting' ? 'Connecting…' : 'Not connected'}
          </span>
        </div>
        <p className="font-mono text-xs break-all text-gray-200">{activeServer}</p>
        {connection === 'connected' && (
          <p className="text-[11px] text-gray-500">{serverVersion} · asset index {assetsReady ? 'ready' : 'synchronizing'}</p>
        )}
        {connection === 'error' && (
          <Notice tone="error" className="mt-2" action={certificatePage ? (
            <a href={certificatePage} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-primary-300 hover:underline whitespace-nowrap">Open certificate page</a>
          ) : undefined}>
            {connectionError || 'The server could not be reached.'}
          </Notice>
        )}
      </div>

      <section>
        <h2 className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Servers</h2>
        <div className="card p-1.5">
          {servers.map((server) => {
            const active = server === activeServer
            return (
              <div key={server} className="flex items-center">
                <button type="button" className="list-row flex-1 min-w-0" onClick={() => void use(server)} disabled={!!busy} aria-pressed={active}>
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${active ? 'bg-primary border-primary' : 'border-white/20'}`}>
                    {active && <IoCheckmarkCircle className="w-4 h-4 text-white" />}
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="font-mono text-xs break-all">{server}</span>
                    {busy === server && <span className="text-[11px] text-gray-400">Connecting…</span>}
                  </span>
                </button>
                <IconButton label={`Remove ${server}`} onClick={() => removeServer(server)} className="hover:text-danger mr-1">
                  <IoTrashOutline className="w-4 h-4" />
                </IconButton>
              </div>
            )
          })}
        </div>
      </section>

      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <Input aria-label="Server URL" placeholder="wss://host:50004" value={url} onChange={(e) => setUrl(e.target.value)} error={error} className="font-mono text-xs" />
        </div>
        <Button variant="secondary" onClick={add} disabled={!url.trim()}>Add</Button>
      </div>

      <div className="space-y-2 text-[11px] leading-relaxed text-gray-500 px-1">
        <p>
          The wallet reads public chain data from ElectrumX and broadcasts transactions it has already signed.
          Keys never leave this browser, and every server must prove it is a Raptoreum mainnet server.
        </p>
        <p>
          A <span className="font-mono">wss://</span> server needs a certificate the browser trusts. For a self-signed certificate,
          open the certificate page once and accept it. <span className="font-mono">ws://</span> is unencrypted and meant for testing only.
        </p>
      </div>
    </div>
  )
}

export default ServerSettings