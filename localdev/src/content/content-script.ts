// Content Script - Injects provider into web pages
// Runs in the page context and bridges messages between inpage script and background

type RuntimeErrorContext = Record<string, unknown> | undefined

// Keep this file self-contained (no module imports), so Rollup emits a single
// classic script for MV3 content_scripts instead of an ESM entry with imports.
const ERROR_STORAGE_KEY = 'metayoshi-runtime-errors-v1'
const MAX_ERROR_LOG_ITEMS = 120
const BRIDGE_TRACE_STORAGE_KEY = 'metayoshi-bridge-trace-v1'
const MAX_BRIDGE_TRACE_ITEMS = 400
const OPEN_WALLET_TRIGGER_SELECTOR = '[data-metayoshi-open-wallet]'

function normalizeUnknownError(input: unknown): { message: string; stack?: string } {
  if (input instanceof Error) return { message: input.message || 'Unknown error', stack: input.stack }
  if (typeof input === 'string') return { message: input }
  try {
    return { message: JSON.stringify(input) }
  } catch {
    return { message: String(input ?? 'Unknown error') }
  }
}

function compactErrorContext(context: RuntimeErrorContext): string | undefined {
  if (!context) return undefined
  try {
    const json = JSON.stringify(context)
    if (!json) return undefined
    return json.length > 1600 ? `${json.slice(0, 1600)}...` : json
  } catch {
    return undefined
  }
}

function compactBridgeTraceContext(context?: Record<string, unknown>): string | undefined {
  if (!context) return undefined
  try {
    const json = JSON.stringify(context)
    if (!json) return undefined
    return json.length > 2500 ? `${json.slice(0, 2500)}...` : json
  } catch {
    return undefined
  }
}

function summarizeBridgeTraceValue(value: unknown, maxLength = 180): string | undefined {
  if (value === undefined) return undefined
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value)
    if (!text) return undefined
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
  } catch {
    const text = String(value)
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
  }
}

async function recordBridgeTrace(
  source: string,
  event: string,
  context?: Record<string, unknown>
): Promise<void> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return
    const current = await chrome.storage.local.get(BRIDGE_TRACE_STORAGE_KEY)
    const rows = Array.isArray(current?.[BRIDGE_TRACE_STORAGE_KEY]) ? current[BRIDGE_TRACE_STORAGE_KEY] : []
    const next = [
      {
        id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        ts: Date.now(),
        source,
        event,
        context: compactBridgeTraceContext(context)
      },
      ...rows
    ].slice(0, MAX_BRIDGE_TRACE_ITEMS)
    await chrome.storage.local.set({ [BRIDGE_TRACE_STORAGE_KEY]: next })
  } catch {
    // Never throw from bridge tracing.
  }
}

async function recordRuntimeError(
  source: string,
  error: unknown,
  context?: RuntimeErrorContext
): Promise<void> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return
    const normalized = normalizeUnknownError(error)
    const current = await chrome.storage.local.get(ERROR_STORAGE_KEY)
    const rows = Array.isArray(current?.[ERROR_STORAGE_KEY]) ? current[ERROR_STORAGE_KEY] : []
    const next = [
      {
        id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        ts: Date.now(),
        source,
        extensionId: chrome.runtime?.id || 'unknown',
        message: normalized.message,
        stack: normalized.stack,
        context: compactErrorContext(context)
      },
      ...rows
    ].slice(0, MAX_ERROR_LOG_ITEMS)
    await chrome.storage.local.set({ [ERROR_STORAGE_KEY]: next })
  } catch {
    // Never throw from runtime monitoring.
  }
}

function installGlobalErrorMonitor(source: string): void {
  const marker = `__metayoshi_error_monitor_installed_${source}`
  const g = globalThis as any
  if (g[marker]) return
  g[marker] = true

  globalThis.addEventListener('error', (event: any) => {
    void recordRuntimeError(source, event?.error ?? event?.message ?? 'Unhandled runtime error', {
      kind: 'error',
      filename: event?.filename,
      lineno: event?.lineno,
      colno: event?.colno
    })
  })

  globalThis.addEventListener('unhandledrejection', (event: any) => {
    void recordRuntimeError(source, event?.reason ?? 'Unhandled promise rejection', {
      kind: 'unhandledrejection'
    })
  })
}

const INPAGE_SCRIPT_ID = 'metayoshi-inpage'
const CS_CONTENT_CHANNEL = 'metayoshi:content'
const CS_INPAGE_CHANNEL = 'metayoshi:inpage'
const CS_EVENT_PORT_NAME = 'metayoshi-inpage-events'
const INJECTION_ALLOWLIST_KEY = 'dapp_injection_allowlist_v1'
const INJECTION_ALLOW_PRIVATE_ORIGINS_KEY = 'dapp_injection_allow_private_origins_v1'
const CONTEXT_INVALIDATED_RE = /extension context invalidated|context invalidated/i
const CONTEXT_INVALIDATED_MSG = 'MetaYoshi extension was updated or reloaded. Refresh this tab and reconnect.'
const CONTEXT_INVALIDATED_AUTO_RELOAD_KEY = 'metayoshi:auto-reloaded-after-context-invalidation'
const BLOCKED_INTERNAL_ORIGIN_MSG = 'Blocked internal application origin'
const CONTENT_RUNTIME_KEY = '__metayoshi_content_runtime_v1'

type ContentRuntimeState = {
  bootStarted: boolean
  messageListenerInstalled: boolean
  bridgeConnecting: boolean
  bridgeReconnectTimer: number | null
  bridgePort: chrome.runtime.Port | null
}

let bridgeContextInvalidated = false
installGlobalErrorMonitor('content-script')

const contentRuntime = (() => {
  const g = globalThis as any
  const existing = g[CONTENT_RUNTIME_KEY] as ContentRuntimeState | undefined
  if (existing) return existing
  const next: ContentRuntimeState = {
    bootStarted: false,
    messageListenerInstalled: false,
    bridgeConnecting: false,
    bridgeReconnectTimer: null,
    bridgePort: null
  }
  g[CONTENT_RUNTIME_KEY] = next
  return next
})()

function normalizeHostPattern(value: string): string {
  return String(value || '').trim().toLowerCase()
}

function hostMatchesPattern(hostname: string, pattern: string): boolean {
  if (!pattern) return false
  if (pattern === hostname) return true
  if (pattern.startsWith('*.')) {
    const base = pattern.slice(2)
    if (!base) return false
    return hostname === base || hostname.endsWith(`.${base}`)
  }
  return false
}

function parseIpv4(hostname: string): number[] | null {
  const parts = hostname.split('.')
  if (parts.length !== 4) return null
  const octets: number[] = []
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null
    const value = Number(part)
    if (!Number.isInteger(value) || value < 0 || value > 255) return null
    octets.push(value)
  }
  return octets
}

function isPrivateOrLoopbackIpv4(hostname: string): boolean {
  const octets = parseIpv4(hostname)
  if (!octets) return false
  const [a, b] = octets
  if (a === 10) return true
  if (a === 127) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 169 && b === 254) return true
  return false
}

function normalizeIpv6(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '').toLowerCase()
}

function isPrivateOrLoopbackIpv6(hostname: string): boolean {
  const normalized = normalizeIpv6(hostname)
  if (!normalized.includes(':')) return false
  if (normalized === '::1' || normalized === '::') return true
  if (normalized.startsWith('fe80:')) return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  return false
}

function isBlockedInternalHostname(hostname: string): boolean {
  const normalized = String(hostname || '').trim().toLowerCase()
  if (!normalized) return false
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true
  if (normalized === 'local' || normalized.endsWith('.local')) return true
  if (isPrivateOrLoopbackIpv4(normalized)) return true
  if (isPrivateOrLoopbackIpv6(normalized)) return true
  return false
}

async function shouldInjectOnCurrentHost(): Promise<boolean> {
  const protocol = String(window.location.protocol || '').trim().toLowerCase()
  if (protocol !== 'http:' && protocol !== 'https:') return false

  const hostname = String(window.location.hostname || '').trim().toLowerCase()
  if (!hostname) return false
  const matchesAnyPattern = (patterns: string[]): boolean => {
    for (const pattern of patterns) {
      if (hostMatchesPattern(hostname, pattern)) return true
    }
    return false
  }

  try {
    const config = await chrome.storage.local.get([INJECTION_ALLOWLIST_KEY, INJECTION_ALLOW_PRIVATE_ORIGINS_KEY])
    const raw = config?.[INJECTION_ALLOWLIST_KEY]
    const allowPrivateOrigins = config?.[INJECTION_ALLOW_PRIVATE_ORIGINS_KEY] === true
    const configured = Array.isArray(raw) 
      ? raw.map(normalizeHostPattern).filter(Boolean) 
      : []

    if (isBlockedInternalHostname(hostname)) {
      if (!allowPrivateOrigins) return false
      return configured.length === 0 ? true : matchesAnyPattern(configured)
    }

    if (configured.length === 0) return true
    return matchesAnyPattern(configured)
  } catch {
    if (isBlockedInternalHostname(hostname)) return false
    return true
  }
}

function injectInpage(): void {
  if (document.getElementById(INPAGE_SCRIPT_ID)) return
  
  const script = document.createElement('script')
  script.id = INPAGE_SCRIPT_ID
  script.async = false
  script.src = chrome.runtime.getURL('assets/inpage.js')
  
  const parent = document.head || document.documentElement
  parent.appendChild(script)
  
  script.onload = () => {
    script.remove()
  }
}

function isWalletSurfaceTriggerElement(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null
  return target.closest(OPEN_WALLET_TRIGGER_SELECTOR)
}

function installWalletSurfaceTriggerBridge(): void {
  window.addEventListener('click', (event) => {
    const trigger = isWalletSurfaceTriggerElement(event.target)
    if (!trigger) return

    void recordBridgeTrace('content-script', 'wallet-surface-trigger-click', {
      origin: window.location.origin || 'unknown',
      path: window.location.pathname || '/',
      triggerTag: trigger.tagName.toLowerCase()
    })

    chrome.runtime.sendMessage({ type: 'METAYOSHI_OPEN_WALLET_SURFACE' }, (resp: any) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError) {
        void recordRuntimeError('content-script', runtimeError.message || 'Failed to request wallet surface open', {
          kind: 'wallet-surface-trigger',
          origin: window.location.origin || 'unknown'
        })
        return
      }

      if (!resp?.ok && resp?.error) {
        void recordRuntimeError('content-script', String(resp.error), {
          kind: 'wallet-surface-trigger',
          origin: window.location.origin || 'unknown'
        })
      }
    })
  }, { capture: true })
}

function postToPage(payload: any): void {
  window.postMessage({ target: CS_INPAGE_CHANNEL, ...payload }, '*')
}

function clearEventBridgeReconnectTimer(): void {
  if (contentRuntime.bridgeReconnectTimer === null) return
  window.clearTimeout(contentRuntime.bridgeReconnectTimer)
  contentRuntime.bridgeReconnectTimer = null
}

function scheduleEventBridgeReconnect(): void {
  if (bridgeContextInvalidated || contentRuntime.bridgePort || contentRuntime.bridgeReconnectTimer !== null) return
  contentRuntime.bridgeReconnectTimer = window.setTimeout(() => {
    contentRuntime.bridgeReconnectTimer = null
    initEventBridge()
  }, 1000)
}

function isContextInvalidatedMessage(message: string): boolean {
  return CONTEXT_INVALIDATED_RE.test(String(message ?? ''))
}

function tryAutoReloadAfterContextInvalidation(): boolean {
  try {
    if (window.top !== window.self) return false
    const alreadyReloaded = window.sessionStorage.getItem(CONTEXT_INVALIDATED_AUTO_RELOAD_KEY) === '1'
    if (alreadyReloaded) return false
    window.sessionStorage.setItem(CONTEXT_INVALIDATED_AUTO_RELOAD_KEY, '1')
    window.setTimeout(() => {
      try {
        window.location.reload()
      } catch {
        // ignore reload errors
      }
    }, 40)
    return true
  } catch {
    return false
  }
}

function markContextInvalidated(message: string): void {
  if (bridgeContextInvalidated) return
  bridgeContextInvalidated = true
  void recordRuntimeError('content-script', message, { kind: 'context-invalidated' })
  tryAutoReloadAfterContextInvalidation()
  postToPage({
    type: 'bridge_error',
    error: {
      code: 4900,
      message: CONTEXT_INVALIDATED_MSG,
      data: { detail: String(message ?? 'Extension context invalidated') }
    }
  })
}

function isBlockedInternalOrigin(rawOrigin: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(String(rawOrigin || ''))
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

  const hostname = String(parsed.hostname || '').trim().toLowerCase()
  if (!hostname) return false

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true
  if (hostname === 'local' || hostname.endsWith('.local')) return true
  if (isPrivateOrLoopbackIpv4(hostname)) return true
  if (isPrivateOrLoopbackIpv6(hostname)) return true
  return false
}

function forwardRequest(request: any, messageId: number): void {
  void recordBridgeTrace('content-script', 'forward-received', {
    messageId,
    method: request?.method,
    requestId: request?.id ?? null,
    origin: window.location.origin || 'unknown',
    params: summarizeBridgeTraceValue(request?.params)
  })

  if (bridgeContextInvalidated) {
    void recordBridgeTrace('content-script', 'forward-blocked-context-invalidated', {
      messageId,
      method: request?.method,
      requestId: request?.id ?? null
    })
    postToPage({
      type: 'response',
      id: messageId,
      response: {
        jsonrpc: '2.0',
        id: request?.id ?? null,
        error: { code: 4900, message: CONTEXT_INVALIDATED_MSG }
      }
    })
    return
  }

  const origin = window.location.origin || 'unknown'
  if (isBlockedInternalOrigin(origin)) {
    void recordBridgeTrace('content-script', 'forward-blocked-origin', {
      messageId,
      method: request?.method,
      requestId: request?.id ?? null,
      origin
    })
    postToPage({
      type: 'response',
      id: messageId,
      response: {
        jsonrpc: '2.0',
        id: request?.id ?? null,
        error: { code: 4001, message: BLOCKED_INTERNAL_ORIGIN_MSG }
      }
    })
    return
  }

  chrome.runtime.sendMessage(
    { 
      type: 'DAPP_INTERNAL_RPC', 
      request,
      origin
    },
    (resp: any) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError) {
        const errorMsg = runtimeError.message || 'Unknown error'
        void recordBridgeTrace('content-script', 'forward-runtime-error', {
          messageId,
          method: request?.method,
          requestId: request?.id ?? null,
          origin,
          message: errorMsg
        })
        void recordRuntimeError('content-script', errorMsg, {
          kind: 'runtime-sendMessage',
          requestMethod: request?.method
        })
        if (isContextInvalidatedMessage(errorMsg)) {
          markContextInvalidated(errorMsg)
        }
        postToPage({
          type: 'response',
          id: messageId,
          response: {
            jsonrpc: '2.0',
            id: request?.id ?? null,
            error: {
              code: isContextInvalidatedMessage(errorMsg) ? 4900 : -32603,
              message: isContextInvalidatedMessage(errorMsg)
                ? CONTEXT_INVALIDATED_MSG
                : String(errorMsg)
            }
          }
        })
        return
      }

      if (!resp || !resp.ok) {
        void recordBridgeTrace('content-script', 'forward-response-error', {
          messageId,
          method: request?.method,
          requestId: request?.id ?? null,
          origin,
          error: summarizeBridgeTraceValue(resp?.jsonRpc?.error ?? resp?.error ?? 'Background unavailable')
        })
        postToPage({
          type: 'response',
          id: messageId,
          response: resp?.jsonRpc ?? {
            jsonrpc: '2.0',
            id: request?.id ?? null,
            error: { code: -32603, message: resp?.error ?? 'Background unavailable' }
          }
        })
        return
      }
      void recordBridgeTrace('content-script', 'forward-response-ok', {
        messageId,
        method: request?.method,
        requestId: request?.id ?? null,
        origin,
        result: summarizeBridgeTraceValue(resp?.jsonRpc?.result)
      })
      postToPage({ type: 'response', id: messageId, response: resp.jsonRpc })
    }
  )
}

function initEventBridge(): void {
  if (bridgeContextInvalidated) return
  if (contentRuntime.bridgePort || contentRuntime.bridgeConnecting) return

  clearEventBridgeReconnectTimer()
  contentRuntime.bridgeConnecting = true

  let port: chrome.runtime.Port | undefined
  try {
    port = chrome.runtime.connect({ name: CS_EVENT_PORT_NAME })
  } catch (err: any) {
    contentRuntime.bridgeConnecting = false
    const errMsg = err?.message ?? String(err ?? '')
    void recordRuntimeError('content-script', errMsg, { kind: 'runtime-connect' })
    if (isContextInvalidatedMessage(errMsg)) {
      markContextInvalidated(errMsg)
      return
    }
    scheduleEventBridgeReconnect()
    return
  }

  contentRuntime.bridgeConnecting = false
  if (!port) {
    scheduleEventBridgeReconnect()
    return
  }

  contentRuntime.bridgePort = port

  port.onMessage.addListener((msg: any) => {
    if (!msg || typeof msg !== 'object') return
    if (msg.type === 'event') {
      postToPage({ type: 'event', event: msg.event, payload: msg.payload })
      return
    }
    if (msg.type === 'ready') {
      postToPage({ type: 'ready', events: msg.events ?? [] })
    }
  })
  
  port.onDisconnect.addListener(() => {
    if (contentRuntime.bridgePort === port) {
      contentRuntime.bridgePort = null
    }
    const runtimeError = chrome.runtime.lastError
    if (runtimeError) {
      const errorMsg = runtimeError.message || 'Unknown error'
      void recordRuntimeError('content-script', errorMsg, { kind: 'runtime-port-disconnect' })
      if (isContextInvalidatedMessage(errorMsg)) {
        markContextInvalidated(errorMsg)
        return
      }
    }
    if (bridgeContextInvalidated) return
    scheduleEventBridgeReconnect()
  })
}

async function boot(): Promise<void> {
  const enabled = await shouldInjectOnCurrentHost()
  if (!enabled) return
  try {
    window.sessionStorage.removeItem(CONTEXT_INVALIDATED_AUTO_RELOAD_KEY)
  } catch {
    // ignore storage errors
  }

  if (!contentRuntime.messageListenerInstalled) {
    window.addEventListener('message', (event) => {
      if (event.source !== window) return
      const data = event.data
      if (!data || data.target !== CS_CONTENT_CHANNEL) return
      if (data.type === 'request') {
        forwardRequest(data.request, data.id)
      }
    })
    contentRuntime.messageListenerInstalled = true
  }

  installWalletSurfaceTriggerBridge()
  injectInpage()
  initEventBridge()
}

if (!contentRuntime.bootStarted) {
  contentRuntime.bootStarted = true
  void boot()
}
