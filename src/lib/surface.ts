/**
 * Where the wallet UI is showing: the browser side panel (Chrome/Edge side
 * panel, Firefox sidebar) or a popup window. The side panel is opened with
 * ?view=sidepanel and stays open, so finishing a request returns to the home
 * screen instead of closing it, and the background routes dApp requests into
 * an open panel instead of opening a popup window.
 */
export const SIDE_PANEL_PORT_PREFIX = 'metayoshi-sidepanel:'

export function isSidePanel(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('view') === 'sidepanel'
  } catch {
    return false
  }
}

/** Ends the current screen: back to the wallet home in the side panel, closes a popup window. */
export function closeSurface(): void {
  if (isSidePanel()) window.location.hash = '#/'
  else window.close()
}

/** Side panel only: keep a port open so the background can show dApp requests here. */
export function initSidePanelBridge(): void {
  if (!isSidePanel() || typeof chrome === 'undefined' || !chrome.runtime?.connect) return
  const connect = async (): Promise<void> => {
    let windowId = -1
    try {
      windowId = (await chrome.windows.getCurrent()).id ?? -1
    } catch {
      // Window lookup unavailable; the background treats -1 as "any window".
    }
    let port: chrome.runtime.Port
    try {
      port = chrome.runtime.connect({ name: `${SIDE_PANEL_PORT_PREFIX}${windowId}` })
    } catch {
      return
    }
    port.onMessage.addListener((message: { type?: string; route?: string }) => {
      if (message?.type === 'route' && typeof message.route === 'string') window.location.hash = `#${message.route}`
    })
    // The service worker can restart; reconnect so requests keep reaching the panel.
    port.onDisconnect.addListener(() => { setTimeout(() => void connect(), 1000) })
  }
  void connect()
}
