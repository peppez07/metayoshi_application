// Inpage Provider Script - Injected into web pages
// Provides window.metayoshi API for DApps

const IP_CONTENT_CHANNEL = 'metayoshi:content'
const IP_INPAGE_CHANNEL = 'metayoshi:inpage'
const INIT_EVENT = 'metayoshi#initialized'
const PROVIDER_STATE_METHOD = 'wallet_getProviderState'
const PROVIDER_ENABLE_METHOD = 'wallet_requestAccounts'

const REQUEST_ACCOUNTS_METHODS = new Set(['wallet_requestAccounts', 'metayoshi_requestAccounts'])
const ACCOUNTS_METHODS = new Set(['wallet_accounts', 'metayoshi_accounts'])
const CONNECT_METHODS = new Set(['wallet_connect', 'metayoshi_connect'])
const SELECT_ACCOUNT_METHODS = new Set(['wallet_selectAccount', 'metayoshi_selectAccount'])
const PROVIDER_STATE_METHODS = new Set(['wallet_getProviderState', 'metayoshi_getProviderState'])

type Listener = (payload: any) => void

type ProviderState = {
  connected: boolean
  unlocked: boolean
  coinId: string | null
  coinName: string | null
  coinSymbol: string | null
  coinDecimals: number | null
  chainId: string | null
  networkLabel: string | null
  accounts: string[]
  selectedAddress: string | null
}

const listeners = new Map<string, Set<Listener>>()
const pending = new Map<number, { method: string; resolve: (value: any) => void; reject: (err: any) => void }>()
let nextId = 1

const state: ProviderState = {
  connected: false,
  unlocked: false,
  coinId: null,
  coinName: null,
  coinSymbol: null,
  coinDecimals: null,
  chainId: null,
  networkLabel: null,
  accounts: [],
  selectedAddress: null
}

function emit(event: string, payload: any): void {
  const set = listeners.get(event)
  if (!set) return
  for (const listener of set) {
    try {
      listener(payload)
    } catch {
      // ignore listener errors
    }
  }
}

function on(event: string, listener: Listener): void {
  const set = listeners.get(event) ?? new Set<Listener>()
  set.add(listener)
  listeners.set(event, set)
}

function removeListener(event: string, listener: Listener): void {
  const set = listeners.get(event)
  if (!set) return
  set.delete(listener)
  if (!set.size) listeners.delete(event)
}

function once(event: string, listener: Listener): void {
  const wrap: Listener = (payload) => {
    removeListener(event, wrap)
    listener(payload)
  }
  on(event, wrap)
}

function updateAccounts(addresses: string[]): void {
  state.accounts = Array.isArray(addresses) ? addresses : []
  state.selectedAddress = state.accounts[0] ?? null
}

function normalizeAccountAddresses(rawAccounts: unknown): string[] {
  if (!Array.isArray(rawAccounts)) return []
  const out: string[] = []
  for (const entry of rawAccounts) {
    if (typeof entry === 'string') {
      const addr = entry.trim()
      if (addr) out.push(addr)
      continue
    }
    if (entry && typeof entry === 'object') {
      const addr = String((entry as any).address ?? '').trim()
      if (addr) out.push(addr)
    }
  }
  return out
}

function applyProviderState(next: any): void {
  if (!next || typeof next !== 'object') return
  state.connected = !!next.connected
  state.unlocked = !!next.unlocked
  state.coinId = next.coinId ?? state.coinId
  state.coinName = next.coinName ?? state.coinName
  state.coinSymbol = next.coinSymbol ?? state.coinSymbol
  state.coinDecimals = next.coinDecimals ?? state.coinDecimals
  state.chainId = next.networkId ?? next.chainId ?? state.chainId
  state.networkLabel = next.networkLabel ?? state.networkLabel
  updateAccounts(normalizeAccountAddresses(next.accounts))
  if (next.selectedAddress) {
    state.selectedAddress = String(next.selectedAddress)
  }
}

function request({ method, params }: { method: string; params?: any }): Promise<any> {
  if (!method || typeof method !== 'string') {
    return Promise.reject(new Error('method is required'))
  }
  const id = nextId++
  const payload = {
    jsonrpc: '2.0',
    id,
    method,
    params
  }
  return new Promise((resolve, reject) => {
    pending.set(id, { method, resolve, reject })
    window.postMessage({ target: IP_CONTENT_CHANNEL, type: 'request', id, request: payload }, '*')
  }).then((result: any) => {
    if (REQUEST_ACCOUNTS_METHODS.has(method)) {
      state.connected = true
      updateAccounts(normalizeAccountAddresses(result))
    }
    if (ACCOUNTS_METHODS.has(method)) {
      updateAccounts(normalizeAccountAddresses(result))
    }
    if (CONNECT_METHODS.has(method) && (result as any)?.connected) {
      state.connected = true
      applyProviderState(result)
    }
    if (SELECT_ACCOUNT_METHODS.has(method) && (result as any)?.selectedAddress) {
      state.selectedAddress = String((result as any).selectedAddress)
    }
    if (PROVIDER_STATE_METHODS.has(method)) {
      applyProviderState(result)
    }
    return result
  })
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return
  const data = event.data as any
  if (!data || data.target !== IP_INPAGE_CHANNEL) return
  
  if (data.type === 'response') {
    const response = data.response
    const id = response?.id ?? data.id
    if (typeof id !== 'number') return
    const pendingReq = pending.get(id)
    if (!pendingReq) return
    pending.delete(id)
    if (response?.error) {
      const err: any = new Error(response.error.message ?? 'Request failed')
      err.code = response.error.code
      err.data = response.error.data
      pendingReq.reject(err)
      return
    }
    pendingReq.resolve(response?.result)
    return
  }
  
  if (data.type === 'bridge_error') {
    const bridgeError = data.error ?? {}
    const err: any = new Error(String(bridgeError.message ?? 'Extension context invalidated'))
    err.code = Number(bridgeError.code ?? 4900)
    err.data = bridgeError.data
    
    // Reject all pending requests
    const pendingEntries = Array.from(pending.values())
    pending.clear()
    for (const req of pendingEntries) {
      try {
        req.reject(err)
      } catch {
        // ignore
      }
    }
    return
  }
  
  if (data.type === 'event') {
    const eventName = String(data.event ?? '')
    const payload = data.payload ?? {}
    
    if (eventName === 'accountsChanged') {
      if (Array.isArray(payload.accounts)) {
        updateAccounts(payload.accounts.map((a: any) => String(a.address ?? a)))
      } else if (payload.address) {
        updateAccounts([String(payload.address)])
      }
      if (payload.address) {
        state.selectedAddress = String(payload.address)
      }
      state.connected = state.accounts.length > 0
      emit('accountsChanged', payload)
    }
    
    if (eventName === 'networkChanged') {
      state.chainId = payload.networkId ?? state.chainId
      state.networkLabel = payload.networkLabel ?? state.networkLabel
      if (payload.coinId !== undefined) state.coinId = payload.coinId ?? state.coinId
      if (payload.coinName !== undefined) state.coinName = payload.coinName ?? state.coinName
      if (payload.coinSymbol !== undefined) state.coinSymbol = payload.coinSymbol ?? state.coinSymbol
      if (payload.coinDecimals !== undefined) state.coinDecimals = payload.coinDecimals ?? state.coinDecimals
      
      // Refresh provider state
      void request({ method: PROVIDER_STATE_METHOD })
        .then((providerState) => applyProviderState(providerState))
        .catch(() => {})
      
      emit('networkChanged', payload)
    }
    
    if (eventName === 'lockChanged') {
      state.unlocked = !!payload.unlocked
      if (!state.unlocked) {
        state.connected = false
        state.accounts = []
        state.selectedAddress = null
      }
      emit('lockChanged', payload)
    }
    
    emit(eventName, payload)
  }
})

function initState(): void {
  request({ method: PROVIDER_STATE_METHOD }).catch(() => {
    // ignore on init
  })
}

// MetaYoshi provider interface (UTXO-focused)
const provider = {
  isMetaYoshi: true,
  isMultiChain: true,
  
  // Coin/Network info
  get coinId() {
    return state.coinId
  },
  get coinName() {
    return state.coinName
  },
  get coinSymbol() {
    return state.coinSymbol
  },
  get coinDecimals() {
    return state.coinDecimals
  },
  get chainId() {
    return state.chainId
  },
  get networkId() {
    return state.chainId
  },
  get networkLabel() {
    return state.networkLabel
  },
  
  // Account info
  get selectedAddress() {
    return state.selectedAddress
  },
  get accounts() {
    return [...state.accounts]
  },
  get isConnected() {
    return state.connected
  },
  get isUnlocked() {
    return state.unlocked
  },
  
  // RPC methods
  request,
  send: request,
  enable: () => request({ method: PROVIDER_ENABLE_METHOD }),
  connect: () => request({ method: 'wallet_connect' }),
  getProviderState: () => request({ method: PROVIDER_STATE_METHOD }),
  getNetworks: () => request({ method: 'wallet_getNetworks' }),
  getCapabilities: () => request({ method: 'wallet_getCapabilities' }),
  
  // Event methods
  on,
  removeListener,
  off: removeListener,
  once,
  
  // Multi-chain methods
  switchNetwork: (networkId: string) => {
    return request({ method: 'wallet_switchNetwork', params: { networkId } })
  },
  
  // Metadata
  _metayoshi: {
    hardwareWallet: false,
    version: import.meta.env.VITE_APP_VERSION ?? '0.0.2-beta',
    multiChain: true
  }
}

// Inject provider into window
if (!(window as any).metayoshi) {
  Object.defineProperty(window, 'metayoshi', {
    value: provider,
    writable: false,
    configurable: false
  })
}

// Dispatch initialization event
window.dispatchEvent(new Event(INIT_EVENT))
initState()

export {}
