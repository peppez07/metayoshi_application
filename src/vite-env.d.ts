/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string
  /** Comma-separated Electrum HTTPS gateway or WebSocket URLs; HTTP/WS for testing only. */
  readonly VITE_RTM_ELECTRUM_SERVERS?: string
  readonly VITE_RTM_EXPLORER?: string
}
