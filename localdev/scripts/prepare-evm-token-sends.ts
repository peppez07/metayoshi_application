import { ethers } from 'ethers'

type PrepCase = {
  name: string
  coin: string
  chain: string
  token: string
  from: string
  recipient: string
  amountUi: string
}

const DEFAULT_RECIPIENT = '0x000000000000000000000000000000000000dEaD'
const DEFAULT_CASES: PrepCase[] = [
  {
    name: 'Ethereum USDC',
    coin: 'ethereum',
    chain: 'main',
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    from: '0xF977814e90dA44bFA03b6295A0616a897441aceC',
    recipient: DEFAULT_RECIPIENT,
    amountUi: '1.25'
  },
  {
    name: 'BSC USDT',
    coin: 'bsc',
    chain: 'main',
    token: '0x55d398326f99059fF775485246999027B3197955',
    from: '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3',
    recipient: DEFAULT_RECIPIENT,
    amountUi: '1.25'
  },
  {
    name: 'Base USDC',
    coin: 'base',
    chain: 'main',
    token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    from: '0x4200000000000000000000000000000000000010',
    recipient: DEFAULT_RECIPIENT,
    amountUi: '1.25'
  }
]

const ERC20_IFACE = new ethers.Interface([
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 value) returns (bool)'
])

function resolveApiBase(): string {
  const raw = String(process.env.VITE_API_BASE_URL || 'https://api.metayoshi.app').trim()
  return raw.replace(/\/+$/, '') || 'https://api.metayoshi.app'
}

function resolveAuthHeader(): string {
  const user = String(process.env.VITE_BRIDGE_USER || '').trim()
  const password = String(process.env.VITE_BRIDGE_PASSWORD || '').trim()
  if (!user || !password) {
    throw new Error('Set VITE_BRIDGE_USER and VITE_BRIDGE_PASSWORD before running the prep smoke script.')
  }
  return `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`
}

async function rpc(url: string, authHeader: string, method: string, params: unknown[]): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: authHeader
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${method}-${Date.now()}`,
      method,
      params
    })
  })
  const rawText = await response.text().catch(() => '')
  let json: any = null
  try {
    json = rawText ? JSON.parse(rawText) : null
  } catch {
    json = null
  }
  if (!response.ok) {
    throw new Error(`${method} failed [HTTP ${response.status}]: ${rawText || response.statusText}`)
  }
  if (json?.error) {
    throw new Error(`${method} rpc error: ${JSON.stringify(json.error)}`)
  }
  return json?.result
}

async function prepareCase(apiBase: string, authHeader: string, entry: PrepCase): Promise<Record<string, unknown>> {
  const bridgeUrl = `${apiBase}/v1/bridge/${encodeURIComponent(entry.coin)}/${encodeURIComponent(entry.chain)}`
  const chainId = Number(BigInt(await rpc(bridgeUrl, authHeader, 'eth_chainId', [])))
  const token = ethers.getAddress(entry.token)
  const from = ethers.getAddress(entry.from)
  const recipient = ethers.getAddress(entry.recipient)
  const code = String(await rpc(bridgeUrl, authHeader, 'eth_getCode', [token, 'latest']) || '0x')
  if (!code || code === '0x') {
    throw new Error(`Token contract ${token} is not deployed on ${entry.coin}/${entry.chain}`)
  }

  const decimalsRaw = await rpc(
    bridgeUrl,
    authHeader,
    'eth_call',
    [{ to: token, data: ERC20_IFACE.encodeFunctionData('decimals', []) }, 'latest']
  )
  const [decimalsValue] = ERC20_IFACE.decodeFunctionResult('decimals', decimalsRaw)
  const decimals = Number(decimalsValue)
  const amountRaw = ethers.parseUnits(entry.amountUi, decimals)
  const data = ERC20_IFACE.encodeFunctionData('transfer', [recipient, amountRaw])
  const gasEstimate = String(await rpc(
    bridgeUrl,
    authHeader,
    'eth_estimateGas',
    [{ from, to: token, data, value: '0x0' }]
  ))

  let feeModel: 'legacy' | 'eip1559' = 'legacy'
  let gasPrice: string | null = null
  let maxFeePerGas: string | null = null
  let maxPriorityFeePerGas: string | null = null

  try {
    const latestBlock = await rpc(bridgeUrl, authHeader, 'eth_getBlockByNumber', ['latest', false])
    const baseFeePerGas = latestBlock?.baseFeePerGas ? BigInt(latestBlock.baseFeePerGas) : null
    if (baseFeePerGas !== null) {
      feeModel = 'eip1559'
      const priorityFee = BigInt(await rpc(bridgeUrl, authHeader, 'eth_maxPriorityFeePerGas', []))
      maxPriorityFeePerGas = priorityFee.toString()
      maxFeePerGas = (baseFeePerGas * 2n + priorityFee).toString()
    } else {
      gasPrice = BigInt(await rpc(bridgeUrl, authHeader, 'eth_gasPrice', [])).toString()
    }
  } catch {
    gasPrice = BigInt(await rpc(bridgeUrl, authHeader, 'eth_gasPrice', [])).toString()
  }

  return {
    case: entry.name,
    bridgeUrl,
    chainId,
    token,
    from,
    recipient,
    decimals,
    amountUi: entry.amountUi,
    amountRaw: amountRaw.toString(),
    gasEstimate,
    feeModel,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
    dataPrefix: data.slice(0, 34),
    dataLength: data.length
  }
}

async function main(): Promise<void> {
  const apiBase = resolveApiBase()
  const authHeader = resolveAuthHeader()
  const results = []

  for (const entry of DEFAULT_CASES) {
    try {
      results.push(await prepareCase(apiBase, authHeader, entry))
    } catch (error) {
      results.push({
        case: entry.name,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  console.log(JSON.stringify({
    apiBase,
    generatedAt: new Date().toISOString(),
    results
  }, null, 2))
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
