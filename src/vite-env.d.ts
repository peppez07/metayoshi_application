/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string
  /** Comma-separated ElectrumX WebSocket URLs (wss:// or ws://). */
  readonly VITE_RTM_ELECTRUM_SERVERS?: string
  readonly VITE_RTM_EXPLORER?: string
}
