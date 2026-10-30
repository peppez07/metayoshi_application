import React, { useState } from 'react'
import { IoCheckmarkCircle, IoTrashOutline } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Badge, IconButton, Notice } from '../../components/ui'
import { isValidServerUrl } from '../../lib/electrum/rtmElectrum'
import type { ChainCheck } from '../../lib/electrum/discovery'
import { useWalletStore } from '../../store/walletStore'

const CHAIN_CHECK_TEXT: Record<ChainCheck, string> = {
  idle: '',
  checking: 'Comparing chain with another server…',
  agreed: 'Chain confirmed by another server',
  unverified: 'No other server available to confirm the chain',
  mismatch: 'Chain differs from other servers. Sending is disabled'
}

const ServerSettings: React.FC = () => {
  const {
    servers, activeServer, connection, connectionError, serverVersion, assetsReady, tipHeight, addServer, removeServer, setActiveServer,
    discoveredServers, peerDiscovery, setPeerDiscovery, chainCheck
  } = useWalletStore()
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
      setError('Use HTTPS, for example https://host/api/v1/electrum, or a WebSocket URL; no credentials or fragments')
      return
    }
    addServer(value)
    setUrl('')
  }

  const syncing = connectionError.includes('synchronizing')
  const statusTone = connection === 'connected' ? 'text-success' : connection === 'connecting' || syncing ? 'text-warning' : 'text-danger'

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="card px-4 py-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Current connection</span>
          <span className={`flex items-center gap-1.5 text-xs font-semibold ${statusTone}`}>
            <span className={`status-dot ${connection === 'connected' ? 'status-dot-green' : connection === 'connecting' || syncing ? 'status-dot-yellow' : 'status-dot-red'}`} />
            {connection === 'connected' ? `Block ${tipHeight.toLocaleString('en-US')}` : syncing ? 'Server synchronizing' : connection === 'connecting' ? 'Connecting…' : 'Not connected'}
          </span>
        </div>
        <p className="font-mono text-xs break-all text-gray-200">{activeServer}</p>
        {connection === 'connected' && (
          <p className="text-[11px] text-gray-500">{serverVersion} · asset index {assetsReady ? 'ready' : 'synchronizing'}</p>
        )}
        {connection === 'connected' && CHAIN_CHECK_TEXT[chainCheck] && (
          <p className={`text-[11px] ${chainCheck === 'agreed' ? 'text-success' : chainCheck === 'mismatch' ? 'text-danger' : 'text-gray-500'}`}>
            {CHAIN_CHECK_TEXT[chainCheck]}
          </p>
        )}
        {connection === 'error' && (
          <Notice tone={syncing ? 'warning' : 'error'} className="mt-2">
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

      <section>
        <div className="flex items-center justify-between px-1 pb-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Discovered servers</h2>
          <label className="flex items-center gap-2 text-[11px] text-gray-400 cursor-pointer">
            Find servers automatically
            <input type="checkbox" className="accent-primary w-4 h-4" checked={peerDiscovery} onChange={(e) => setPeerDiscovery(e.target.checked)} />
          </label>
        </div>
        {peerDiscovery && (
          <div className="card p-1.5">
            {discoveredServers.length === 0 && (
              <p className="px-3 py-3 text-[11px] text-gray-500">
                No other servers found yet. Servers are discovered among Raptoreum smartnodes running the HTTPS gateway.
              </p>
            )}
            {discoveredServers.map((peer) => {
              const active = peer.url === activeServer
              return (
                <button key={peer.url} type="button" className="list-row w-full" onClick={() => void use(peer.url)} disabled={!!busy} aria-pressed={active}>
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${active ? 'bg-primary border-primary' : 'border-white/20'}`}>
                    {active && <IoCheckmarkCircle className="w-4 h-4 text-white" />}
                  </span>
                  <span className="flex flex-col min-w-0 text-left">
                    <span className="font-mono text-xs break-all">{new URL(peer.url).hostname}</span>
                    <span className="text-[11px] text-gray-500">
                      {busy === peer.url ? 'Connecting…' : `Block ${peer.height.toLocaleString('en-US')} · seen ${new Date(peer.seenAt).toLocaleDateString()}`}
                    </span>
                  </span>
                  <span className="ml-auto flex gap-1 shrink-0">
                    {peer.smartnode && <Badge tone="success">Smartnode</Badge>}
                    {!peer.assetsReady && <Badge tone="warning">Syncing</Badge>}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <Input aria-label="Server URL" placeholder="https://host/api/v1/electrum" value={url} onChange={(e) => setUrl(e.target.value)} error={error} className="font-mono text-xs" />
        </div>
        <Button variant="secondary" onClick={add} disabled={!url.trim()}>Add</Button>
      </div>

      <div className="space-y-2 text-[11px] leading-relaxed text-gray-500 px-1">
        <p>
          The wallet reads public chain data from ElectrumX and broadcasts transactions it has already signed.
          Keys never leave this browser, and every server must prove it is a Raptoreum mainnet server.
        </p>
        <p>
          Use <span className="font-mono">https://</span> with a browser-trusted certificate. HTTPS checks for chain and asset changes every 15 seconds.
          Secure WebSocket (<span className="font-mono">wss://</span>) is also supported.
          Unencrypted <span className="font-mono">http://</span> and <span className="font-mono">ws://</span> URLs are for explicit testing only.
          No server password is required.
        </p>
      </div>
    </div>
  )
}

export default ServerSettings
