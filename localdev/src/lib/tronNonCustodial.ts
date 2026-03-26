import { ethers } from 'ethers'
import { TronWeb } from 'tronweb'
import { estimateEvmTxFee } from './evmFee'
import { callBridgeMethod, sendBridgeEvmSignedRelay, type UtxoRpcConfig } from './utxoRpc'

const ERC20_METADATA_IFACE = new ethers.Interface([
  'function symbol() view returns (string)',
  'function symbol() view returns (bytes32)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 value) returns (bool)'
])

function parseTrxToSun(amount: string): bigint {
  const raw = String(amount || '').trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error('Invalid TRX amount')
  const [whole, frac = ''] = raw.split('.')
  if (frac.length > 6) throw new Error('TRX supports up to 6 decimals')
  const sun = BigInt(`${whole}${frac.padEnd(6, '0')}`.replace(/^0+/, '') || '0')
  if (sun <= 0n) throw new Error('Amount must be greater than 0')
  return sun
}

function parseDecimalToBigInt(amount: string, decimals: number, label: string): bigint {
  const raw = String(amount || '').trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error(`Invalid ${label} amount`)
  const [whole, frac = ''] = raw.split('.')
  if (frac.length > decimals) throw new Error(`${label} supports up to ${decimals} decimals`)
  const combined = `${whole}${frac.padEnd(decimals, '0')}`.replace(/^0+/, '') || '0'
  const out = BigInt(combined)
  if (out <= 0n) throw new Error('Amount must be greater than 0')
  return out
}

function formatAtomicUnits(value: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals)
  const whole = value / base
  const fraction = value % base
  const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '')
  return fractionText ? `${whole.toString()}.${fractionText}` : whole.toString()
}

function normalizePrivateKeyHex(value: string): string {
  const normalized = String(value || '').trim().replace(/^0x/i, '')
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) throw new Error('Invalid TRON private key')
  return `0x${normalized.toLowerCase()}`
}

export async function normalizeTronRpcAddress(address: string): Promise<string> {
  const raw = String(address || '').trim()
  if (!raw) throw new Error('TRON address is required')
  if (/^0x[0-9a-fA-F]{40}$/.test(raw)) return ethers.getAddress(raw)
  if (/^41[0-9a-fA-F]{40}$/.test(raw)) return ethers.getAddress(`0x${raw.slice(2)}`)
  if (!TronWeb.isAddress(raw)) throw new Error('Invalid TRON address')
  const hex = String(TronWeb.address.toHex(raw) || '').trim()
  if (!/^41[0-9a-fA-F]{40}$/.test(hex)) throw new Error('Invalid TRON address')
  return ethers.getAddress(`0x${hex.slice(2)}`)
}

function normalizeTronBase58Address(address: string): string {
  const raw = String(address || '').trim()
  if (!TronWeb.isAddress(raw)) throw new Error('Invalid TRON address')
  return raw
}

async function resolveTronChainId(rpcConfig: UtxoRpcConfig): Promise<number> {
  const chainIdHex = await callBridgeMethod(rpcConfig, 'eth_chainId', [])
  const resolved = Number(BigInt(String(chainIdHex || '0x0')))
  if (!Number.isFinite(resolved) || resolved <= 0) throw new Error('Invalid TRON bridge chainId')
  return resolved
}

async function resolveTronNonce(rpcConfig: UtxoRpcConfig, fromHex: string): Promise<number> {
  const nonceHex = await callBridgeMethod(rpcConfig, 'eth_getTransactionCount', [fromHex, 'pending'])
  return Number(BigInt(String(nonceHex || '0x0')))
}

function decodeTrc20Symbol(raw: string): string {
  try {
    const [value] = ERC20_METADATA_IFACE.decodeFunctionResult('symbol', raw)
    const asText = String(value || '').trim()
    if (asText) return asText.toUpperCase()
  } catch {
    // Try bytes32 fallback below.
  }
  try {
    const [value] = ERC20_METADATA_IFACE.decodeFunctionResult('symbol', raw)
    const bytes = String(value || '').replace(/^0x/i, '')
    const text = Buffer.from(bytes, 'hex').toString('utf8').replace(/\0/g, '').trim()
    if (text) return text.toUpperCase()
  } catch {
    // Fall through to default.
  }
  return 'TRC20'
}

export async function readTrc20TokenMetadata(rpcConfig: UtxoRpcConfig, contractAddress: string): Promise<{ symbol: string; decimals: number }> {
  const normalized = await normalizeTronRpcAddress(contractAddress)
  const [symbolRaw, decimalsRaw] = await Promise.all([
    callBridgeMethod(rpcConfig, 'eth_call', [{ to: normalized, data: ERC20_METADATA_IFACE.encodeFunctionData('symbol', []) }, 'latest']).catch(() => '0x'),
    callBridgeMethod(rpcConfig, 'eth_call', [{ to: normalized, data: ERC20_METADATA_IFACE.encodeFunctionData('decimals', []) }, 'latest']).catch(() => '0x')
  ])
  let decimals = 6
  try {
    const [decoded] = ERC20_METADATA_IFACE.decodeFunctionResult('decimals', String(decimalsRaw || '0x'))
    const next = Number(decoded)
    if (Number.isFinite(next) && next >= 0 && next <= 30) decimals = Math.trunc(next)
  } catch {
    // Keep TRON-style 6-decimal fallback.
  }
  return {
    symbol: decodeTrc20Symbol(String(symbolRaw || '0x')),
    decimals
  }
}

export async function getTrc20BalanceRaw(rpcConfig: UtxoRpcConfig, contractAddress: string, owner: string): Promise<bigint> {
  const normalized = await normalizeTronRpcAddress(contractAddress)
  const ownerHex = await normalizeTronRpcAddress(owner)
  const data = ERC20_METADATA_IFACE.encodeFunctionData('balanceOf', [ownerHex])
  const raw = await callBridgeMethod(rpcConfig, 'eth_call', [{ to: normalized, data }, 'latest'])
  try {
    const [decoded] = ERC20_METADATA_IFACE.decodeFunctionResult('balanceOf', String(raw || '0x'))
    return BigInt(String(decoded || '0'))
  } catch {
    return 0n
  }
}

export async function sendTrc20NonCustodial(params: {
  rpcConfig: UtxoRpcConfig
  contractAddress: string
  fromAddress: string
  toAddress: string
  amountRaw: bigint
  privateKeyHex: string
}): Promise<{ hash: string }> {
  const fromAddress = normalizeTronBase58Address(params.fromAddress)
  const toAddress = normalizeTronBase58Address(params.toAddress)
  if (params.amountRaw <= 0n) throw new Error('Amount must be greater than 0')

  const privateKey = normalizePrivateKeyHex(params.privateKeyHex)
  const derivedAddress = TronWeb.address.fromPrivateKey(privateKey.replace(/^0x/i, ''))
  if (!derivedAddress || derivedAddress !== fromAddress) {
    throw new Error(`Derived TRON signer does not match active address (${derivedAddress || 'unknown'} != ${fromAddress})`)
  }

  const [fromHex, toHex, contractHex, chainId] = await Promise.all([
    normalizeTronRpcAddress(fromAddress),
    normalizeTronRpcAddress(toAddress),
    normalizeTronRpcAddress(params.contractAddress),
    resolveTronChainId(params.rpcConfig)
  ])
  const nonce = await resolveTronNonce(params.rpcConfig, fromHex)
  const data = ERC20_METADATA_IFACE.encodeFunctionData('transfer', [toHex, params.amountRaw])
  const feeQuote = await estimateEvmTxFee({
    rpcConfig: params.rpcConfig,
    from: fromHex,
    to: contractHex,
    data,
    valueWei: 0n,
    fallbackGasLimitHex: '0x186a0'
  })
  const wallet = new ethers.Wallet(privateKey)
  const txToSign: any = {
    to: contractHex,
    value: 0n,
    nonce,
    gasLimit: feeQuote.gasLimit,
    chainId,
    data
  }
  if (feeQuote.type === 2) {
    txToSign.type = 2
    txToSign.maxFeePerGas = feeQuote.maxFeePerGas
    txToSign.maxPriorityFeePerGas = feeQuote.maxPriorityFeePerGas
  } else {
    txToSign.gasPrice = feeQuote.gasPrice ?? 1_000_000_000n
  }
  const signed = await wallet.signTransaction(txToSign)
  const submitted = await sendBridgeEvmSignedRelay(params.rpcConfig, {
    kind: 'asset',
    signedTxHex: signed
  })
  return { hash: String(submitted.txid || '').trim() }
}

export function parseTrc20UiAmountToRaw(amountUi: string, decimals: number): bigint {
  const d = Number(decimals)
  const safeDecimals = Number.isFinite(d) ? Math.max(0, Math.min(18, Math.trunc(d))) : 6
  return parseDecimalToBigInt(amountUi, safeDecimals, 'TRC20')
}

export async function getTronBalance(rpcConfig: UtxoRpcConfig, address: string): Promise<string> {
  const normalized = await normalizeTronRpcAddress(address)
  const raw = await callBridgeMethod(rpcConfig, 'eth_getBalance', [normalized, 'latest'])
  const sun = BigInt(String(raw || '0x0'))
  return formatAtomicUnits(sun, 6)
}

export async function sendTronNonCustodial(params: {
  rpcConfig: UtxoRpcConfig
  fromAddress: string
  toAddress: string
  amountTrx: string
  privateKeyHex: string
}): Promise<{ hash: string }> {
  const fromAddress = normalizeTronBase58Address(params.fromAddress)
  const toAddress = normalizeTronBase58Address(params.toAddress)
  const privateKey = normalizePrivateKeyHex(params.privateKeyHex)
  const derivedAddress = TronWeb.address.fromPrivateKey(privateKey.replace(/^0x/i, ''))
  if (!derivedAddress || derivedAddress !== fromAddress) {
    throw new Error(`Derived TRON signer does not match active address (${derivedAddress || 'unknown'} != ${fromAddress})`)
  }

  const [fromHex, toHex, chainId] = await Promise.all([
    normalizeTronRpcAddress(fromAddress),
    normalizeTronRpcAddress(toAddress),
    resolveTronChainId(params.rpcConfig)
  ])
  const nonce = await resolveTronNonce(params.rpcConfig, fromHex)
  const amountSun = parseTrxToSun(params.amountTrx)
  const feeQuote = await estimateEvmTxFee({
    rpcConfig: params.rpcConfig,
    from: fromHex,
    to: toHex,
    valueWei: amountSun,
    fallbackGasLimitHex: '0x5208'
  })
  const wallet = new ethers.Wallet(privateKey)
  const txToSign: any = {
    to: toHex,
    value: amountSun,
    nonce,
    gasLimit: feeQuote.gasLimit,
    chainId
  }
  if (feeQuote.type === 2) {
    txToSign.type = 2
    txToSign.maxFeePerGas = feeQuote.maxFeePerGas
    txToSign.maxPriorityFeePerGas = feeQuote.maxPriorityFeePerGas
  } else {
    txToSign.gasPrice = feeQuote.gasPrice ?? 1_000_000_000n
  }
  const signed = await wallet.signTransaction(txToSign)
  const submitted = await sendBridgeEvmSignedRelay(params.rpcConfig, {
    kind: 'coin',
    signedTxHex: signed
  })
  return { hash: String(submitted.txid || '').trim() }
}
