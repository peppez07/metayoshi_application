import { JsonRpcHTTPTransport, SuiJsonRpcClient } from '@mysten/sui/jsonRpc'
import type { UtxoRpcConfig } from './utxoRpc'

function requireBridgeField(value: unknown, label: string): string {
  const normalized = String(value || '').trim()
  if (!normalized) throw new Error(`${label} is required for Sui bridge transport`)
  return normalized
}

export function createSuiBridgeClient(rpcConfig: Pick<UtxoRpcConfig, 'bridgeUrl' | 'bridgeUsername' | 'bridgePassword'>): SuiJsonRpcClient {
  const bridgeUrl = requireBridgeField(rpcConfig.bridgeUrl, 'Bridge URL')
  const bridgeUsername = requireBridgeField(rpcConfig.bridgeUsername, 'Bridge username')
  const bridgePassword = requireBridgeField(rpcConfig.bridgePassword, 'Bridge password')

  return new SuiJsonRpcClient({
    network: 'mainnet',
    transport: new JsonRpcHTTPTransport({
      url: bridgeUrl,
      rpc: {
        headers: {
          Authorization: `Basic ${btoa(`${bridgeUsername}:${bridgePassword}`)}`
        }
      }
    })
  })
}
