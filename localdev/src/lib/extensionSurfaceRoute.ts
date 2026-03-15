export const EXTENSION_SURFACE_ROUTE_STORAGE_KEY = 'metayoshi.extension.surface.route'

type ExtensionSurfaceRouteEntry = {
  route: string
  updatedAt: number
}

function canUseChromeStorageLocal(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
}

export function normalizeExtensionSurfaceRoute(route: unknown): string {
  const normalized = String(route || '').trim()
  if (!normalized) return '/'
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

export function parseExtensionSurfaceRouteEntry(value: unknown): ExtensionSurfaceRouteEntry | null {
  if (!value || typeof value !== 'object') return null
  const entry = value as Record<string, unknown>
  const route = normalizeExtensionSurfaceRoute(entry.route)
  const updatedAt = Number(entry.updatedAt || Date.now())
  return { route, updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now() }
}

export async function setExtensionSurfaceRoute(route: string): Promise<void> {
  if (!canUseChromeStorageLocal()) return
  await chrome.storage.local.set({
    [EXTENSION_SURFACE_ROUTE_STORAGE_KEY]: {
      route: normalizeExtensionSurfaceRoute(route),
      updatedAt: Date.now()
    }
  })
}

export async function getExtensionSurfaceRoute(): Promise<ExtensionSurfaceRouteEntry | null> {
  if (!canUseChromeStorageLocal()) return null
  const stored = await chrome.storage.local.get(EXTENSION_SURFACE_ROUTE_STORAGE_KEY)
  return parseExtensionSurfaceRouteEntry(stored[EXTENSION_SURFACE_ROUTE_STORAGE_KEY])
}

export async function clearExtensionSurfaceRoute(): Promise<void> {
  if (!canUseChromeStorageLocal()) return
  await chrome.storage.local.remove(EXTENSION_SURFACE_ROUTE_STORAGE_KEY)
}
