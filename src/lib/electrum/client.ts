/**
 * Minimal Electrum protocol client over WebSocket (the only socket transport a
 * browser extension can open). One JSON-RPC message per WebSocket frame.
 */

export const ELECTRUM_RETRY_CODE = -32001
const CLIENT_NAME = `MetaYoshi ${import.meta.env.VITE_APP_VERSION ?? ''}`.trim()
const PROTOCOL_VERSION = '1.4'
const CONNECT_TIMEOUT_MS = 10_000
const REQUEST_TIMEOUT_MS = 20_000
const PING_INTERVAL_MS = 60_000
const MAX_RETRIES = 4

export class ElectrumError extends Error {
  constructor(message: string, readonly code?: number) {
    super(message)
    this.name = 'ElectrumError'
  }
}

type NotificationHandler = (params: unknown[]) => void

interface Pending {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'closed'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class ElectrumClient {
  private socket: WebSocket | null = null
  private connecting: Promise<void> | null = null
  private nextId = 1
  private pending = new Map<number, Pending>()
  private handlers = new Map<string, Set<NotificationHandler>>()
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private stateListeners = new Set<(state: ConnectionState) => void>()
  state: ConnectionState = 'idle'
  serverVersion = ''

  constructor(readonly url: string) {}

  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  private setState(state: ConnectionState): void {
    this.state = state
    for (const listener of this.stateListeners) listener(state)
  }

  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) return
    if (this.connecting) return this.connecting
    this.connecting = this.open().finally(() => {
      this.connecting = null
    })
    return this.connecting
  }

  private open(): Promise<void> {
    this.setState('connecting')
    return new Promise<void>((resolve, reject) => {
      let socket: WebSocket
      try {
        socket = new WebSocket(this.url)
      } catch (error) {
        this.setState('closed')
        reject(new ElectrumError(`Cannot open ${this.url}: ${String(error)}`))
        return
      }
      const timer = setTimeout(() => {
        socket.close()
        reject(new ElectrumError(`Timed out connecting to ${this.url}`))
      }, CONNECT_TIMEOUT_MS)

      socket.onopen = () => {
        clearTimeout(timer)
        this.socket = socket
        this.send<[string, string]>('server.version', [CLIENT_NAME, PROTOCOL_VERSION])
          .then((version) => {
            this.serverVersion = Array.isArray(version) ? String(version[0]) : ''
            this.startPing()
            this.setState('connected')
            resolve()
          })
          .catch((error) => {
            socket.close()
            reject(error)
          })
      }
      socket.onerror = () => {
        clearTimeout(timer)
        reject(new ElectrumError(`Connection to ${this.url} failed`))
      }
      socket.onclose = () => {
        clearTimeout(timer)
        if (this.socket === socket) this.handleClose()
      }
      socket.onmessage = (event) => this.handleMessage(String(event.data))
    })
  }

  private handleClose(): void {
    this.socket = null
    this.stopPing()
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(new ElectrumError('Connection closed'))
      this.pending.delete(id)
    }
    this.setState('closed')
  }

  private handleMessage(text: string): void {
    let messages: any[]
    try {
      const parsed = JSON.parse(text)
      messages = Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      return
    }
    for (const message of messages) {
      if (message && typeof message.id === 'number' && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id)!
        this.pending.delete(message.id)
        clearTimeout(pending.timer)
        if (message.error) {
          const err = message.error
          pending.reject(new ElectrumError(String(err.message ?? err), typeof err.code === 'number' ? err.code : undefined))
        } else {
          pending.resolve(message.result)
        }
      } else if (message && typeof message.method === 'string') {
        const params = Array.isArray(message.params) ? message.params : []
        for (const handler of this.handlers.get(message.method) ?? []) handler(params)
      }
    }
  }

  private send<T>(method: string, params: unknown[]): Promise<T> {
    const socket = this.socket
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new ElectrumError('Not connected'))
    }
    const id = this.nextId++
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new ElectrumError(`${method} timed out`))
      }, REQUEST_TIMEOUT_MS)
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer })
      socket.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
    })
  }

  /** Sends a request, connecting first and retrying the server's transient "retry" errors. */
  async request<T>(method: string, params: unknown[] = []): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      await this.connect()
      try {
        return await this.send<T>(method, params)
      } catch (error) {
        const retryable = error instanceof ElectrumError && error.code === ELECTRUM_RETRY_CODE
        if (!retryable || attempt >= MAX_RETRIES) throw error
        await sleep(250 * 2 ** attempt)
      }
    }
  }

  on(method: string, handler: NotificationHandler): () => void {
    const set = this.handlers.get(method) ?? new Set()
    set.add(handler)
    this.handlers.set(method, set)
    return () => set.delete(handler)
  }

  private startPing(): void {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      this.send('server.ping', []).catch(() => undefined)
    }, PING_INTERVAL_MS)
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer)
    this.pingTimer = null
  }

  close(): void {
    const socket = this.socket
    this.socket = null
    socket?.close()
    this.handleClose()
  }
}
