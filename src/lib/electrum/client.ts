/** Public Electrum JSON-RPC over HTTPS or WebSocket. No wallet secrets or cookies. */
export const ELECTRUM_RETRY_CODE = -32001
const CLIENT_NAME = `MetaYoshi ${import.meta.env.VITE_APP_VERSION ?? ''}`.trim()
const PROTOCOL_VERSION = '1.4'
const CONNECT_TIMEOUT_MS = 10_000
const REQUEST_TIMEOUT_MS = 20_000
const PING_INTERVAL_MS = 60_000
const POLL_INTERVAL_MS = 15_000
const MAX_RETRIES = 4
const BROADCAST = 'blockchain.transaction.broadcast'
const SUBSCRIPTIONS = new Set(['blockchain.headers.subscribe', 'blockchain.scripthash.subscribe', 'blockchain.scripthash.assets.subscribe'])

export class ElectrumError extends Error {
  constructor(message: string, readonly code?: number) {
    super(message)
    this.name = 'ElectrumError'
  }
}

export function isValidServerUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['https:', 'http:', 'wss:', 'ws:'].includes(parsed.protocol) && !!parsed.hostname &&
      !parsed.username && !parsed.password && !parsed.href.includes('#')
  } catch { return false }
}

function protocolError(error: { code?: unknown; message?: unknown }): ElectrumError {
  const code = typeof error.code === 'number' ? error.code : undefined
  return new ElectrumError(code === ELECTRUM_RETRY_CODE
    ? 'The server is synchronizing or temporarily busy. The wallet will reconnect automatically; please wait.'
    : String(error.message ?? 'Electrum request failed'), code)
}

type NotificationHandler = (params: unknown[]) => void
interface Pending {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}
interface Subscription { method: string; params: unknown[]; last: string | undefined }
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'closed'

export class ElectrumClient {
  private socket: WebSocket | null = null
  private connecting: Promise<void> | null = null
  private nextId = 1
  private generation = 0
  private pending = new Map<number, Pending>()
  private controllers = new Set<AbortController>()
  private delays = new Map<ReturnType<typeof setTimeout>, (error: Error) => void>()
  private handlers = new Map<string, Set<NotificationHandler>>()
  private subscriptions = new Map<string, Subscription>()
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private stateListeners = new Set<(state: ConnectionState) => void>()
  private readonly http: boolean
  private session = ''
  state: ConnectionState = 'idle'
  serverVersion = ''

  constructor(readonly url: string) {
    if (!isValidServerUrl(url)) throw new ElectrumError('Use an HTTPS or WebSocket server URL without credentials or fragments')
    this.http = ['https:', 'http:'].includes(new URL(url).protocol)
  }

  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  private setState(state: ConnectionState): void {
    this.state = state
    for (const listener of this.stateListeners) listener(state)
  }

  async connect(): Promise<void> {
    if (this.state === 'connected') return
    if (this.connecting) return this.connecting
    const generation = this.generation
    this.setState('connecting')
    const connecting = (this.http ? this.openHttp(generation) : this.openSocket(generation)).finally(() => {
      if (this.connecting === connecting) this.connecting = null
    })
    this.connecting = connecting
    return connecting
  }

  private assertCurrent(generation: number): void {
    if (generation !== this.generation) throw new ElectrumError('Connection closed')
  }

  private async openHttp(generation: number): Promise<void> {
    // Electrum server.version is single-use on an upstream TCP connection.
    // A new logical connection must get a new token, while cursors and polls
    // share that token until this connection closes.
    this.session = globalThis.crypto.randomUUID()
    try {
      const version = await this.sendHttp<[string, string]>('server.version', [CLIENT_NAME, PROTOCOL_VERSION], CONNECT_TIMEOUT_MS)
      this.assertCurrent(generation)
      this.serverVersion = Array.isArray(version) ? String(version[0]) : ''
      this.startPolling()
      this.setState('connected')
    } catch (error) {
      if (generation === this.generation) this.handleClose()
      throw error
    }
  }

  private openSocket(generation: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let socket: WebSocket
      try {
        socket = new WebSocket(this.url)
        this.socket = socket
      } catch {
        this.setState('closed')
        reject(new ElectrumError('Cannot open Electrum connection'))
        return
      }
      const timer = setTimeout(() => {
        socket.close()
        reject(new ElectrumError('Timed out connecting to Electrum server'))
      }, CONNECT_TIMEOUT_MS)
      socket.onopen = () => {
        clearTimeout(timer)
        if (generation !== this.generation) { socket.close(); reject(new ElectrumError('Connection closed')); return }
        this.send<[string, string]>('server.version', [CLIENT_NAME, PROTOCOL_VERSION])
          .then((version) => {
            this.assertCurrent(generation)
            this.serverVersion = Array.isArray(version) ? String(version[0]) : ''
            this.startPing()
            this.setState('connected')
            resolve()
          })
          .catch((error) => { socket.close(); reject(error) })
      }
      socket.onerror = () => {
        clearTimeout(timer)
        reject(new ElectrumError('Connection to Electrum server failed'))
        socket.close()
      }
      socket.onclose = () => {
        clearTimeout(timer)
        reject(new ElectrumError('Connection closed'))
        if (this.socket === socket) this.handleClose()
      }
      socket.onmessage = (event) => {
        if (generation === this.generation) this.handleMessage(String(event.data))
      }
    })
  }

  private handleClose(): void {
    this.generation += 1
    this.socket = null
    this.stopTimers()
    this.subscriptions.clear()
    for (const controller of this.controllers) controller.abort()
    this.controllers.clear()
    for (const [timer, reject] of this.delays) { clearTimeout(timer); reject(new ElectrumError('Connection closed')) }
    this.delays.clear()
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(new ElectrumError('Connection closed'))
    }
    this.pending.clear()
    this.setState('closed')
  }

  private handleMessage(text: string): void {
    let messages: any[]
    try {
      const parsed = JSON.parse(text)
      messages = Array.isArray(parsed) ? parsed : [parsed]
    } catch { return }
    for (const message of messages) {
      if (message && typeof message.id === 'number' && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id)!
        this.pending.delete(message.id)
        clearTimeout(pending.timer)
        if (message.error) pending.reject(protocolError(message.error))
        else pending.resolve(message.result)
      } else if (message && typeof message.method === 'string') {
        this.notify(message.method, Array.isArray(message.params) ? message.params : [])
      }
    }
  }

  private notify(method: string, params: unknown[]): void {
    for (const handler of this.handlers.get(method) ?? []) handler(params)
  }

  private async sendHttp<T>(method: string, params: unknown[], timeout = REQUEST_TIMEOUT_MS): Promise<T> {
    const generation = this.generation
    const id = this.nextId++
    const controller = new AbortController()
    this.controllers.add(controller)
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
      const response = await fetch(this.url, {
        method: 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-Electrum-Session': this.session },
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
      })
      this.assertCurrent(generation)
      if (response.status === 503) {
        // Gateway overload can precede JSON parsing (id:null), and a proxy
        // may return HTML. Do not trust or allocate an arbitrary error body.
        await response.body?.cancel()
        throw protocolError({ code: ELECTRUM_RETRY_CODE })
      }
      if (!response.ok) throw new ElectrumError(`Electrum HTTP request failed (${response.status})`)
      const message = await response.json()
      this.assertCurrent(generation)
      if (!message || message.jsonrpc !== '2.0' || message.id !== id ||
        (message.error ? typeof message.error !== 'object' : !Object.prototype.hasOwnProperty.call(message, 'result'))) {
        throw new ElectrumError('Invalid Electrum response or mismatched response ID')
      }
      if (message.error) throw protocolError(message.error)
      return message.result as T
    } catch (error) {
      if (error instanceof ElectrumError) throw error
      throw new ElectrumError(controller.signal.aborted ? 'Electrum request cancelled or timed out' : 'Electrum HTTP request failed')
    } finally {
      clearTimeout(timer)
      this.controllers.delete(controller)
    }
  }

  private send<T>(method: string, params: unknown[]): Promise<T> {
    if (this.http) return this.sendHttp<T>(method, params)
    const socket = this.socket
    if (!socket || socket.readyState !== WebSocket.OPEN) return Promise.reject(new ElectrumError('Not connected'))
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

  /** Only read requests may retry. A broadcast's outcome must never be guessed. */
  async request<T>(method: string, params: unknown[] = []): Promise<T> {
    const generation = this.generation
    for (let attempt = 0; ; attempt += 1) {
      try {
        await this.connect()
        this.assertCurrent(generation)
        const result = await this.send<T>(method, params)
        this.assertCurrent(generation)
        if (this.http && SUBSCRIPTIONS.has(method)) {
          const key = JSON.stringify([method, params])
          this.subscriptions.set(key, { method, params: [...params], last: JSON.stringify(result) })
        }
        return result
      } catch (error) {
        if (method === BROADCAST) {
          const code = error instanceof ElectrumError ? error.code : undefined
          throw new ElectrumError(code === ELECTRUM_RETRY_CODE
            ? 'The server is synchronizing or temporarily busy. Transaction submission was not confirmed; check its status before sending again.'
            : 'Transaction submission was not confirmed. Check its status before sending again.', code)
        }
        const retryable = error instanceof ElectrumError && error.code === ELECTRUM_RETRY_CODE
        if (!retryable || attempt >= MAX_RETRIES || generation !== this.generation) throw error
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => { this.delays.delete(timer); resolve() }, 250 * 2 ** attempt)
          this.delays.set(timer, reject)
        })
        this.assertCurrent(generation)
      }
    }
  }

  on(method: string, handler: NotificationHandler): () => void {
    const set = this.handlers.get(method) ?? new Set()
    set.add(handler)
    this.handlers.set(method, set)
    return () => set.delete(handler)
  }

  private startPolling(): void {
    let running = false
    const generation = this.generation
    this.pollTimer = setInterval(() => {
      if (running || generation !== this.generation) return
      running = true
      void Promise.all([...this.subscriptions.values()].map(async (subscription) => {
        const result = await this.send(subscription.method, subscription.params)
        this.assertCurrent(generation)
        const serialized = JSON.stringify(result)
        if (serialized !== subscription.last) {
          subscription.last = serialized
          this.notify(subscription.method, subscription.method === 'blockchain.headers.subscribe' ? [result] : [...subscription.params, result])
        }
      })).catch(() => {
        if (generation === this.generation) this.handleClose()
      }).finally(() => { running = false })
    }, POLL_INTERVAL_MS)
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => { this.send('server.ping', []).catch(() => undefined) }, PING_INTERVAL_MS)
  }

  private stopTimers(): void {
    if (this.pingTimer) clearInterval(this.pingTimer)
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.pingTimer = null
    this.pollTimer = null
  }

  close(): void {
    const socket = this.socket
    this.connecting = null
    this.handleClose()
    socket?.close()
  }
}
