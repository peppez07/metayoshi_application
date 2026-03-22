import { cpSync, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { createDeflateRaw } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const ZIP_VERSION_NEEDED = 20
const COMPRESSION_METHOD_DEFLATE = 8
const GENERAL_PURPOSE_UTF8 = 1 << 11

function getDosDateTime(date) {
  const year = Math.max(1980, date.getFullYear())
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = Math.floor(date.getSeconds() / 2)
  const dosTime = (hours << 11) | (minutes << 5) | seconds
  const dosDate = ((year - 1980) << 9) | (month << 5) | day
  return { dosDate, dosTime }
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let c = index
  for (let k = 0; k < 8; k += 1) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
  }
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

async function deflateRaw(buffer) {
  const chunks = []
  const stream = createDeflateRaw({ level: 9 })
  stream.on('data', (chunk) => chunks.push(chunk))
  stream.end(buffer)
  await new Promise((resolvePromise, rejectPromise) => {
    stream.on('end', resolvePromise)
    stream.on('error', rejectPromise)
  })
  return Buffer.concat(chunks)
}

function listFiles(dir) {
  const entries = []
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      entries.push(...listFiles(fullPath))
    } else if (stat.isFile()) {
      entries.push(fullPath)
    }
  }
  return entries.sort((a, b) => a.localeCompare(b))
}

async function createZipFromDir(sourceDir, zipPath) {
  const sourceRoot = resolve(sourceDir)
  const files = listFiles(sourceRoot)
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const fullPath of files) {
    const relPath = relative(sourceRoot, fullPath).replace(/\\/g, '/')
    const nameBuffer = Buffer.from(relPath, 'utf8')
    const input = readFileSync(fullPath)
    const compressed = await deflateRaw(input)
    const crc = crc32(input)
    const stat = statSync(fullPath)
    const { dosDate, dosTime } = getDosDateTime(stat.mtime)

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(ZIP_VERSION_NEEDED, 4)
    localHeader.writeUInt16LE(GENERAL_PURPOSE_UTF8, 6)
    localHeader.writeUInt16LE(COMPRESSION_METHOD_DEFLATE, 8)
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(compressed.length, 18)
    localHeader.writeUInt32LE(input.length, 22)
    localHeader.writeUInt16LE(nameBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28)

    localParts.push(localHeader, nameBuffer, compressed)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(ZIP_VERSION_NEEDED, 6)
    centralHeader.writeUInt16LE(GENERAL_PURPOSE_UTF8, 8)
    centralHeader.writeUInt16LE(COMPRESSION_METHOD_DEFLATE, 10)
    centralHeader.writeUInt16LE(dosTime, 12)
    centralHeader.writeUInt16LE(dosDate, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(compressed.length, 20)
    centralHeader.writeUInt32LE(input.length, 24)
    centralHeader.writeUInt16LE(nameBuffer.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)
    centralParts.push(centralHeader, nameBuffer)

    offset += localHeader.length + nameBuffer.length + compressed.length
  }

  const centralDir = Buffer.concat(centralParts)
  const endRecord = Buffer.alloc(22)
  endRecord.writeUInt32LE(0x06054b50, 0)
  endRecord.writeUInt16LE(0, 4)
  endRecord.writeUInt16LE(0, 6)
  endRecord.writeUInt16LE(files.length, 8)
  endRecord.writeUInt16LE(files.length, 10)
  endRecord.writeUInt32LE(centralDir.length, 12)
  endRecord.writeUInt32LE(offset, 16)
  endRecord.writeUInt16LE(0, 20)

  mkdirSync(dirname(zipPath), { recursive: true })
  const output = createWriteStream(zipPath)
  for (const part of [...localParts, centralDir, endRecord]) {
    output.write(part)
  }
  await new Promise((resolvePromise, rejectPromise) => {
    output.end(resolvePromise)
    output.on('error', rejectPromise)
  })
}

function rewriteManifestForTarget(manifestPath, target) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

  if (target === 'firefox') {
    manifest.background = {
      scripts: ['background.js'],
      type: 'module'
    }
  } else {
    manifest.background = {
      service_worker: 'background.js',
      type: 'module'
    }
  }

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

async function main() {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const distDir = resolve(rootDir, 'dist')
  const releasesDir = resolve(rootDir, 'releases')
  const tmpDir = resolve(rootDir, '.tmp-release')

  if (!existsSync(distDir)) {
    throw new Error('dist directory not found. Run the build first.')
  }

  mkdirSync(releasesDir, { recursive: true })
  rmSync(tmpDir, { recursive: true, force: true })
  mkdirSync(tmpDir, { recursive: true })

  const chromeDir = resolve(tmpDir, 'chrome')
  const firefoxDir = resolve(tmpDir, 'firefox')
  cpSync(distDir, chromeDir, { recursive: true })
  cpSync(distDir, firefoxDir, { recursive: true })

  rewriteManifestForTarget(resolve(chromeDir, 'manifest.json'), 'chrome')
  rewriteManifestForTarget(resolve(firefoxDir, 'manifest.json'), 'firefox')

  await createZipFromDir(chromeDir, resolve(releasesDir, 'metayoshi-chrome-0.2.1.zip'))
  await createZipFromDir(firefoxDir, resolve(releasesDir, 'metayoshi-firefox-0.2.1.zip'))
  rmSync(tmpDir, { recursive: true, force: true })

  console.log('Release archives rebuilt without directory entries and with browser-specific manifests.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
