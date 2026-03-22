import fs from 'node:fs'
import path from 'node:path'

function printUsage() {
  console.error(
    [
      'Usage:',
      '  node scripts/extract-wallet-addresses.mjs <input.json> [--format json|csv]',
      '',
      'Accepted inputs:',
      '  - MetaYoshi full backup JSON',
      '  - raw metayoshi-storage JSON',
      '  - a browser storage export object containing {"metayoshi-storage": ...}'
    ].join('\n')
  )
}

function parseArgs(argv) {
  const out = {
    inputPath: '',
    format: 'json'
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = String(argv[i] || '').trim()
    if (!arg) continue

    if (arg === '--format') {
      const next = String(argv[i + 1] || '').trim().toLowerCase()
      if (!next) throw new Error('Missing value after --format')
      out.format = next
      i += 1
      continue
    }

    if (arg.startsWith('--format=')) {
      out.format = arg.slice('--format='.length).trim().toLowerCase()
      continue
    }

    if (!out.inputPath) {
      out.inputPath = arg
      continue
    }

    throw new Error(`Unexpected argument: ${arg}`)
  }

  if (!out.inputPath) throw new Error('Missing input file path')
  if (!['json', 'csv'].includes(out.format)) {
    throw new Error(`Unsupported format "${out.format}". Use json or csv.`)
  }

  return out
}

function readJson(filePath) {
  const absolutePath = path.resolve(filePath)
  const raw = fs.readFileSync(absolutePath, 'utf8').replace(/^\uFEFF/, '')
  return {
    absolutePath,
    parsed: JSON.parse(raw)
  }
}

function looksLikeWalletState(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray(value.accounts)
  )
}

function resolveWalletPayload(input) {
  if (input && typeof input === 'object') {
    const record = input

    if (record.type === 'metayoshi-full-backup' && Array.isArray(record.accounts)) {
      return { sourceType: 'full-backup', payload: record }
    }

    if (looksLikeWalletState(record)) {
      return { sourceType: 'wallet-state', payload: record }
    }

    if (looksLikeWalletState(record.state)) {
      return { sourceType: 'persisted-envelope', payload: record.state }
    }

    if (looksLikeWalletState(record['metayoshi-storage'])) {
      return { sourceType: 'storage-export', payload: record['metayoshi-storage'] }
    }

    if (looksLikeWalletState(record['metayoshi-storage']?.state)) {
      return { sourceType: 'storage-export-envelope', payload: record['metayoshi-storage'].state }
    }
  }

  throw new Error('Unsupported input JSON shape')
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

function buildRecords(walletPayload) {
  const accounts = Array.isArray(walletPayload.accounts) ? walletPayload.accounts : []
  const activeAccountId = normalizeText(walletPayload.activeAccountId)
  const activeNetworkId = normalizeText(walletPayload.activeNetworkId)
  const records = []
  const genericAddressRecords = []

  for (const account of accounts) {
    const accountId = normalizeText(account?.id)
    const accountName = normalizeText(account?.name)
    const derivationIndex = Number.isInteger(account?.derivationIndex) ? account.derivationIndex : null
    const isActiveAccount = accountId !== '' && accountId === activeAccountId

    const networkAddresses = account?.networkAddresses && typeof account.networkAddresses === 'object'
      ? account.networkAddresses
      : {}

    const addresses = account?.addresses && typeof account.addresses === 'object'
      ? account.addresses
      : {}

    for (const [networkIdRaw, addressRaw] of Object.entries(networkAddresses)) {
      const networkId = normalizeText(networkIdRaw)
      const address = normalizeText(addressRaw)
      if (!networkId || !address) continue

      records.push({
        accountId,
        accountName,
        derivationIndex,
        networkId,
        address,
        isActiveAccount,
        isActiveNetwork: networkId === activeNetworkId
      })
    }

    for (const [addressTypeRaw, addressRaw] of Object.entries(addresses)) {
      const addressType = normalizeText(addressTypeRaw)
      const address = normalizeText(addressRaw)
      if (!addressType || !address) continue

      genericAddressRecords.push({
        accountId,
        accountName,
        derivationIndex,
        addressType,
        address,
        isActiveAccount
      })
    }
  }

  records.sort((a, b) => {
    if ((a.derivationIndex ?? 9e9) !== (b.derivationIndex ?? 9e9)) {
      return (a.derivationIndex ?? 9e9) - (b.derivationIndex ?? 9e9)
    }
    if (a.accountName !== b.accountName) return a.accountName.localeCompare(b.accountName)
    return a.networkId.localeCompare(b.networkId)
  })

  genericAddressRecords.sort((a, b) => {
    if ((a.derivationIndex ?? 9e9) !== (b.derivationIndex ?? 9e9)) {
      return (a.derivationIndex ?? 9e9) - (b.derivationIndex ?? 9e9)
    }
    if (a.accountName !== b.accountName) return a.accountName.localeCompare(b.accountName)
    return a.addressType.localeCompare(b.addressType)
  })

  return {
    activeAccountId,
    activeNetworkId,
    accountCount: accounts.length,
    networkAddressCount: records.length,
    genericAddressCount: genericAddressRecords.length,
    records,
    genericAddressRecords
  }
}

function escapeCsv(value) {
  const text = String(value ?? '')
  if (!/[",\n]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function toCsv(records) {
  const headers = [
    'accountId',
    'accountName',
    'derivationIndex',
    'networkId',
    'address',
    'isActiveAccount',
    'isActiveNetwork'
  ]

  const lines = [headers.join(',')]
  for (const row of records) {
    lines.push(headers.map((key) => escapeCsv(row[key])).join(','))
  }
  return lines.join('\n')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const { absolutePath, parsed } = readJson(args.inputPath)
  const { sourceType, payload } = resolveWalletPayload(parsed)
  const extracted = buildRecords(payload)

  if (args.format === 'csv') {
    process.stdout.write(`${toCsv(extracted.records)}\n`)
    return
  }

  process.stdout.write(
    JSON.stringify(
      {
        sourcePath: absolutePath,
        sourceType,
        ...extracted
      },
      null,
      2
    ) + '\n'
  )
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`extract-wallet-addresses: ${message}`)
  printUsage()
  process.exitCode = 1
}
