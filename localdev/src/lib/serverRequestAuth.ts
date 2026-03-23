import type { Network } from '../coins'
import type { UtxoRpcConfig } from './utxoRpc'
import { getSecureBridgeSessionInfo } from './utxoRpc'

const APP_API_KEY = String((import.meta as any)?.env?.VITE_APP_API_KEY || '').trim()

export async function appendOptionalServerAuthHeaders(
  headers: Record<string, string>,
  input: {
    network?: Pick<Network, 'bridgeUsername' | 'bridgePassword'>
    rpcConfig?: UtxoRpcConfig
  } = {}
): Promise<void> {
  const { network, rpcConfig } = input
  const canTryBearer = Boolean(
    rpcConfig?.bridgeUrl
    && typeof rpcConfig?.secureBridgeSigner === 'function'
  )
  if (canTryBearer) {
    try {
      const session = await getSecureBridgeSessionInfo(rpcConfig!)
      if (session.token) headers.Authorization = `Bearer ${session.token}`
    } catch {
      // Fall back to API key / legacy Basic auth when bearer session is unavailable.
    }
  }

  if (APP_API_KEY) headers['X-API-Key'] = APP_API_KEY

  if (String(headers.Authorization || '').trim().toLowerCase().startsWith('bearer ')) return

  const username = String(rpcConfig?.bridgeUsername || network?.bridgeUsername || '').trim()
  const password = String(rpcConfig?.bridgePassword || network?.bridgePassword || '').trim()
  if (!username || !password) return
  headers.Authorization = `Basic ${btoa(`${username}:${password}`)}`
}
