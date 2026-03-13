import { ethers } from 'ethers'

type EvmNetworkVerificationTarget = {
  id: 'aurora' | 'gnosis' | 'bahamut'
  name: string
  symbol: string
  chainId: number
  rpcUrl: string
  explorerUrl: string
}

const TEST_MNEMONIC = 'test test test test test test test test test test test junk'
const TEST_RECIPIENT = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const TEST_VALUE_WEI = ethers.parseEther('0.000001')
const REQUEST_TIMEOUT_MS = 15_000

const TARGETS: EvmNetworkVerificationTarget[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    symbol: 'ETH',
    chainId: 1313161554,
    rpcUrl: 'https://mainnet.aurora.dev',
    explorerUrl: 'https://explorer.aurora.dev'
  },
  {
    id: 'gnosis',
    name: 'Gnosis',
    symbol: 'XDAI',
    chainId: 100,
    rpcUrl: 'https://rpc.gnosischain.com',
    explorerUrl: 'https://gnosisscan.io'
  },
  {
    id: 'bahamut',
    name: 'Bahamut',
    symbol: 'FTN',
    chainId: 5165,
    rpcUrl: 'https://rpc1.bahamut.io',
    explorerUrl: 'https://ftnscan.com'
  }
]

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message)
}

type EvmFeeQuote = {
  gasLimit: bigint
  estimatedFeeWei: bigint
  gasPrice?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  type?: 2
}

function scaleFee(value: bigint): bigint {
  return value
}

function parseHexBigInt(value: unknown, fallback = 0n): bigint {
  try {
    const raw = String(value ?? '').trim()
    if (!raw) return fallback
    return BigInt(raw)
  } catch {
    return fallback
  }
}

async function rpcCall<T>(target: EvmNetworkVerificationTarget, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(target.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${target.id}:${method}`,
      method,
      params
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error(`${target.id} RPC ${method} failed with HTTP ${response.status}`)
  }

  const json = await response.json() as { result?: T; error?: { message?: string } }
  if (json.error) {
    throw new Error(`${target.id} RPC ${method} error: ${String(json.error.message || 'unknown RPC error')}`)
  }
  return json.result as T
}

async function verifyExplorerAddressPage(target: EvmNetworkVerificationTarget, address: string): Promise<void> {
  const explorerUrl = `${target.explorerUrl.replace(/\/+$/, '')}/address/${address}`
  const response = await fetch(explorerUrl, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  })
  if (!response.ok) {
    throw new Error(`${target.id} explorer rejected address page with HTTP ${response.status}`)
  }
}

async function estimateFeeQuote(target: EvmNetworkVerificationTarget, from: string): Promise<EvmFeeQuote> {
  const txForEstimate = {
    from,
    to: TEST_RECIPIENT,
    value: ethers.toQuantity(TEST_VALUE_WEI)
  }

  let gasLimitHex = '0x5208'
  try {
    gasLimitHex = await rpcCall<string>(target, 'eth_estimateGas', [txForEstimate])
  } catch {
    // Some nodes reject balance-less estimate requests. Keep the canonical transfer fallback.
  }
  const gasLimit = parseHexBigInt(gasLimitHex, 21_000n)

  let gasPriceWei = 1_000_000_000n
  try {
    gasPriceWei = parseHexBigInt(await rpcCall<string>(target, 'eth_gasPrice', []), gasPriceWei)
  } catch {
    // Keep a sane fallback if the node does not expose legacy gas price.
  }

  let baseFeeWei = 0n
  try {
    const latestBlock = await rpcCall<{ baseFeePerGas?: string }>(target, 'eth_getBlockByNumber', ['latest', false])
    baseFeeWei = parseHexBigInt(latestBlock?.baseFeePerGas, 0n)
  } catch {
    // Pre-EIP1559 chains or restrictive RPCs can omit baseFeePerGas.
  }

  if (baseFeeWei > 0n) {
    let maxPriorityFeePerGas = 1_500_000_000n
    try {
      maxPriorityFeePerGas = parseHexBigInt(
        await rpcCall<string>(target, 'eth_maxPriorityFeePerGas', []),
        maxPriorityFeePerGas
      )
    } catch {
      // Keep fallback priority fee.
    }

    maxPriorityFeePerGas = scaleFee(maxPriorityFeePerGas)
    if (maxPriorityFeePerGas < 1_000_000_000n) {
      maxPriorityFeePerGas = 1_000_000_000n
    }

    const candidateFromBase = (baseFeeWei * 2n) + maxPriorityFeePerGas
    const candidateFromGasPrice = gasPriceWei + maxPriorityFeePerGas
    let maxFeePerGas = candidateFromBase > candidateFromGasPrice ? candidateFromBase : candidateFromGasPrice
    maxFeePerGas = scaleFee(maxFeePerGas)
    if (maxFeePerGas <= maxPriorityFeePerGas) {
      maxFeePerGas = maxPriorityFeePerGas + 1_000_000_000n
    }

    return {
      type: 2,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      estimatedFeeWei: gasLimit * maxFeePerGas
    }
  }

  gasPriceWei = scaleFee(gasPriceWei)
  if (gasPriceWei <= 0n) gasPriceWei = 1_000_000_000n

  return {
    gasLimit,
    gasPrice: gasPriceWei,
    estimatedFeeWei: gasLimit * gasPriceWei
  }
}

async function verifyTarget(target: EvmNetworkVerificationTarget): Promise<void> {
  const wallet = ethers.HDNodeWallet.fromPhrase(TEST_MNEMONIC, undefined, `m/44'/60'/0'/0/0`)
  const from = wallet.address

  assert(ethers.isAddress(from), `${target.id} derived address is not a valid EVM address`)

  const chainIdHex = await rpcCall<string>(target, 'eth_chainId', [])
  const resolvedChainId = Number(BigInt(chainIdHex))
  assert(
    resolvedChainId === target.chainId,
    `${target.id} chain mismatch: expected ${target.chainId}, got ${resolvedChainId}`
  )

  await verifyExplorerAddressPage(target, from)

  const nonceHex = await rpcCall<string>(target, 'eth_getTransactionCount', [from, 'pending'])
  const feeQuote = await estimateFeeQuote(target, from)

  const tx: Record<string, unknown> = {
    to: TEST_RECIPIENT,
    value: TEST_VALUE_WEI,
    nonce: Number(BigInt(nonceHex)),
    gasLimit: feeQuote.gasLimit,
    chainId: target.chainId
  }

  if (feeQuote.type === 2) {
    tx.type = 2
    tx.maxFeePerGas = feeQuote.maxFeePerGas
    tx.maxPriorityFeePerGas = feeQuote.maxPriorityFeePerGas
  } else {
    tx.gasPrice = feeQuote.gasPrice
  }

  const signedTx = await wallet.signTransaction(tx)
  const parsed = ethers.Transaction.from(signedTx)

  assert(parsed.from?.toLowerCase() === from.toLowerCase(), `${target.id} signed transaction recovered an unexpected sender`)
  assert(Number(parsed.chainId) === target.chainId, `${target.id} signed transaction has the wrong chainId`)
  assert(parsed.to?.toLowerCase() === TEST_RECIPIENT.toLowerCase(), `${target.id} signed transaction has the wrong recipient`)
  assert(parsed.value === TEST_VALUE_WEI, `${target.id} signed transaction has the wrong transfer value`)

  const feeEth = Number(ethers.formatEther(feeQuote.estimatedFeeWei))
  const feeLabel = feeQuote.type === 2
    ? `type=2 gasLimit=${feeQuote.gasLimit.toString()} maxFeePerGas=${feeQuote.maxFeePerGas?.toString()}`
    : `type=legacy gasLimit=${feeQuote.gasLimit.toString()} gasPrice=${feeQuote.gasPrice?.toString()}`

  console.log(
    `${target.name}: address=${from} chainId=${resolvedChainId} explorer=ok fee=${feeEth} ${target.symbol} ${feeLabel} txHash=${parsed.hash}`
  )
}

async function main(): Promise<void> {
  for (const target of TARGETS) {
    await verifyTarget(target)
  }
  console.log(`Verified ${TARGETS.length} dedicated EVM network definitions.`)
}

main().catch((error) => {
  console.error('EVM network verification failed.')
  console.error(error)
  process.exitCode = 1
})
