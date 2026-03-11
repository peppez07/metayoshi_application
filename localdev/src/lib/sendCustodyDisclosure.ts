import type { Network } from '../coins'
import { resolveChainSendCustodyMode } from './chainRpcAdapter'

export type SendCustodyDisclosure = {
  body: string
  label: string
}

export function resolveSendCustodyDisclosure(network: Network): SendCustodyDisclosure | null {
  const mode = resolveChainSendCustodyMode(network)
  if (mode !== 'custodial-server') return null

  return {
    label: 'Send route: server-assisted',
    body: `${network.name} sends in this build still depend on server-side wallet infrastructure instead of MetaYoshi's standard local-signing path. Use this route only if you accept that server dependency.`
  }
}
