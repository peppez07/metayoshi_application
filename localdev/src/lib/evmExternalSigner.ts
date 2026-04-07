import { ethers } from 'ethers'

export type EvmExternalSignerMode = 'local' | 'hardware' | 'walletconnect'

export interface EvmExternalSignTxInput {
  chainId?: number
  to?: string
  valueWei?: bigint
  data?: string
  gasLimit?: bigint
  gasPrice?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  nonce?: number
  type?: 2
}

export interface EvmExternalSigner {
  mode: Exclude<EvmExternalSignerMode, 'local'>
  getAddress: () => Promise<string>
  signMessage: (message: string | Uint8Array) => Promise<string>
  signTypedData: (domain: Record<string, any>, types: Record<string, any>, value: Record<string, any>) => Promise<string>
  signTransaction?: (input: EvmExternalSignTxInput) => Promise<string>
  sendTransaction: (input: EvmExternalSignTxInput) => Promise<{ hash: string }>
}

function parseMode(raw: string): EvmExternalSignerMode {
  const normalized = String(raw || '').trim().toLowerCase()
  if (normalized === 'hardware') return 'hardware'
  if (normalized === 'walletconnect') return 'walletconnect'
  return 'local'
}

export function resolveEvmExternalSignerMode(): EvmExternalSignerMode {
  return parseMode(String((import.meta as any)?.env?.VITE_EVM_SIGNER_MODE || 'local'))
}

function isWalletConnectSignerRuntimeEnabled(): boolean {
  const raw = String((import.meta as any)?.env?.VITE_ENABLE_WALLETCONNECT_SIGNER || '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

function normalizeEvmAddress(value: string): string {
  if (!ethers.isAddress(value)) throw new Error(`Invalid EVM address: ${value}`)
  return ethers.getAddress(value)
}

function parseChainList(value: string): number[] {
  const out: number[] = []
  const entries = String(value || '')
    .split(',')
    .map((row) => row.trim())
    .filter(Boolean)
  for (const entry of entries) {
    if (/^eip155:\d+$/i.test(entry)) {
      out.push(Number(entry.split(':')[1]))
      continue
    }
    if (/^\d+$/.test(entry)) {
      out.push(Number(entry))
    }
  }
  return Array.from(new Set(out.filter((n) => Number.isInteger(n) && n > 0)))
}

async function withBrowserSigner<T>(
  providerLike: any,
  fn: (ctx: { provider: ethers.BrowserProvider; signer: ethers.JsonRpcSigner }) => Promise<T>,
  expectedAddress?: string
): Promise<T> {
  const provider = new ethers.BrowserProvider(providerLike as any)
  const signer = await provider.getSigner()
  if (expectedAddress) {
    const signerAddress = normalizeEvmAddress(await signer.getAddress())
    if (signerAddress !== normalizeEvmAddress(expectedAddress)) {
      throw new Error(`External signer address mismatch (${signerAddress} != ${normalizeEvmAddress(expectedAddress)})`)
    }
  }
  return await fn({ provider, signer })
}

async function maybeSwitchChain(providerLike: any, chainId?: number): Promise<void> {
  if (!Number.isInteger(chainId) || !chainId || chainId <= 0) return
  const hexChainId = `0x${Number(chainId).toString(16)}`
  try {
    await providerLike.request?.({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }]
    })
  } catch {
    // Keep provider-selected chain if switching is unavailable.
  }
}

function resolveExpectedExternalAddress(): string | undefined {
  const value = String((import.meta as any)?.env?.VITE_EVM_EXTERNAL_SIGNER_ADDRESS || '').trim()
  if (!value) return undefined
  return normalizeEvmAddress(value)
}

function createInjectedHardwareSigner(): EvmExternalSigner {
  const expectedAddress = resolveExpectedExternalAddress()
  const injected = (globalThis as any)?.window?.ethereum
  if (!injected) {
    throw new Error('Injected EVM provider is unavailable for hardware signer mode')
  }
  return {
    mode: 'hardware',
    getAddress: async () => {
      await injected.request?.({ method: 'eth_requestAccounts' })
      return await withBrowserSigner(injected, async ({ signer }) => normalizeEvmAddress(await signer.getAddress()), expectedAddress)
    },
    signMessage: async (message) => {
      await injected.request?.({ method: 'eth_requestAccounts' })
      return await withBrowserSigner(injected, async ({ signer }) => await signer.signMessage(message as any), expectedAddress)
    },
    signTypedData: async (domain, types, value) => {
      await injected.request?.({ method: 'eth_requestAccounts' })
      return await withBrowserSigner(
        injected,
        async ({ signer }) => await (signer as any).signTypedData(domain, types, value),
        expectedAddress
      )
    },
    signTransaction: async (input) => {
      await injected.request?.({ method: 'eth_requestAccounts' })
      await maybeSwitchChain(injected, input.chainId)
      return await withBrowserSigner(injected, async ({ signer }) => await signer.signTransaction({
        to: input.to ? normalizeEvmAddress(input.to) : undefined,
        value: input.valueWei ?? 0n,
        data: String(input.data || '').trim() || undefined,
        gasLimit: input.gasLimit ?? undefined,
        gasPrice: input.gasPrice ?? undefined,
        maxFeePerGas: input.maxFeePerGas ?? undefined,
        maxPriorityFeePerGas: input.maxPriorityFeePerGas ?? undefined,
        nonce: input.nonce ?? undefined,
        type: input.type ?? undefined
      }), expectedAddress)
    },
    sendTransaction: async (input) => {
      await injected.request?.({ method: 'eth_requestAccounts' })
      await maybeSwitchChain(injected, input.chainId)
      return await withBrowserSigner(injected, async ({ signer }) => {
        const tx = await signer.sendTransaction({
          to: input.to ? normalizeEvmAddress(input.to) : undefined,
          value: input.valueWei ?? 0n,
          data: String(input.data || '').trim() || undefined,
          gasLimit: input.gasLimit ?? undefined,
          gasPrice: input.gasPrice ?? undefined,
          maxFeePerGas: input.maxFeePerGas ?? undefined,
          maxPriorityFeePerGas: input.maxPriorityFeePerGas ?? undefined,
          nonce: input.nonce ?? undefined,
          type: input.type ?? undefined
        })
        return { hash: String(tx?.hash || '').trim() }
      }, expectedAddress)
    }
  }
}

let wcProviderSingleton: any = null

async function getWalletConnectProvider(): Promise<any> {
  if (wcProviderSingleton) return wcProviderSingleton
  if (!isWalletConnectSignerRuntimeEnabled()) {
    throw new Error('WalletConnect signer mode is disabled in this build')
  }
  const chainListRaw = String((import.meta as any)?.env?.VITE_WALLETCONNECT_CHAINS || '')
  const chainIds = parseChainList(chainListRaw)
  void chainIds
  throw new Error('WalletConnect signer mode is currently unavailable in the extension build')
}

function createWalletConnectSigner(): EvmExternalSigner {
  const expectedAddress = resolveExpectedExternalAddress()
  return {
    mode: 'walletconnect',
    getAddress: async () => {
      const wc = await getWalletConnectProvider()
      await wc.connect?.()
      await wc.request?.({ method: 'eth_requestAccounts', params: [] })
      return await withBrowserSigner(wc, async ({ signer }) => normalizeEvmAddress(await signer.getAddress()), expectedAddress)
    },
    signMessage: async (message) => {
      const wc = await getWalletConnectProvider()
      await wc.connect?.()
      await wc.request?.({ method: 'eth_requestAccounts', params: [] })
      return await withBrowserSigner(wc, async ({ signer }) => await signer.signMessage(message as any), expectedAddress)
    },
    signTypedData: async (domain, types, value) => {
      const wc = await getWalletConnectProvider()
      await wc.connect?.()
      await wc.request?.({ method: 'eth_requestAccounts', params: [] })
      return await withBrowserSigner(
        wc,
        async ({ signer }) => await (signer as any).signTypedData(domain, types, value),
        expectedAddress
      )
    },
    signTransaction: async (input) => {
      const wc = await getWalletConnectProvider()
      await wc.connect?.()
      await wc.request?.({ method: 'eth_requestAccounts', params: [] })
      await maybeSwitchChain(wc, input.chainId)
      return await withBrowserSigner(wc, async ({ signer }) => await signer.signTransaction({
        to: input.to ? normalizeEvmAddress(input.to) : undefined,
        value: input.valueWei ?? 0n,
        data: String(input.data || '').trim() || undefined,
        gasLimit: input.gasLimit ?? undefined,
        gasPrice: input.gasPrice ?? undefined,
        maxFeePerGas: input.maxFeePerGas ?? undefined,
        maxPriorityFeePerGas: input.maxPriorityFeePerGas ?? undefined,
        nonce: input.nonce ?? undefined,
        type: input.type ?? undefined
      }), expectedAddress)
    },
    sendTransaction: async (input) => {
      const wc = await getWalletConnectProvider()
      await wc.connect?.()
      await wc.request?.({ method: 'eth_requestAccounts', params: [] })
      await maybeSwitchChain(wc, input.chainId)
      return await withBrowserSigner(wc, async ({ signer }) => {
        const tx = await signer.sendTransaction({
          to: input.to ? normalizeEvmAddress(input.to) : undefined,
          value: input.valueWei ?? 0n,
          data: String(input.data || '').trim() || undefined,
          gasLimit: input.gasLimit ?? undefined,
          gasPrice: input.gasPrice ?? undefined,
          maxFeePerGas: input.maxFeePerGas ?? undefined,
          maxPriorityFeePerGas: input.maxPriorityFeePerGas ?? undefined,
          nonce: input.nonce ?? undefined,
          type: input.type ?? undefined
        })
        return { hash: String(tx?.hash || '').trim() }
      }, expectedAddress)
    }
  }
}

export async function resolveEvmExternalSigner(): Promise<EvmExternalSigner | null> {
  const mode = resolveEvmExternalSignerMode()
  if (mode === 'local') return null
  if (mode === 'hardware') return createInjectedHardwareSigner()
  if (!isWalletConnectSignerRuntimeEnabled()) {
    throw new Error('WalletConnect signer mode is disabled in this build')
  }
  return createWalletConnectSigner()
}
