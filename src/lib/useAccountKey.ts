import { useEffect, useState } from 'react'
import { bytesToHex } from './rtm/bytes'
import { derivationPath, deriveAccountKey, privateKeyToWif } from './rtm/address'
import { activeAccountOf, networkParams, useWalletStore } from '../store/walletStore'

export interface AccountKeyInfo {
  accountName: string
  symbol: string
  address: string
  path: string
  wif: string
  publicKey: string
}

/** Derives the active account's key on the selected network for display; requires an unlocked session. */
export function useAccountKey(): AccountKeyInfo | null {
  const state = useWalletStore()
  const network = networkParams(state)
  const account = activeAccountOf(state)
  const mnemonic = state.sessionMnemonic
  const [info, setInfo] = useState<AccountKeyInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!mnemonic || !account) {
      setInfo(null)
      return
    }
    void deriveAccountKey(mnemonic, account.derivationIndex, network).then((key) => {
      if (cancelled) return
      setInfo({
        accountName: account.name,
        symbol: network.symbol,
        address: key.address,
        path: derivationPath(account.derivationIndex, network),
        wif: privateKeyToWif(key.privateKey, network),
        publicKey: bytesToHex(key.pubkey)
      })
    })
    return () => { cancelled = true }
  }, [mnemonic, account?.id, account?.derivationIndex, account?.name, network])

  return info
}
