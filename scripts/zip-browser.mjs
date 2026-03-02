import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'

const target = String(process.argv[2] || '').trim().toLowerCase()
if (!target || !['chrome', 'brave', 'firefox', 'chromium'].includes(target)) {
  console.error('Usage: node scripts/zip-browser.mjs <chrome|brave|firefox|chromium>')
  process.exit(1)
}

const root = process.cwd()
const sourceDirMap = {
  chrome: 'dist-chrome',
  brave: 'dist-brave',
  firefox: 'dist-firefox',
  chromium: 'dist-chromium'
}
const sourceDir = path.join(root, sourceDirMap[target])
const outputZip = path.join(root, `Metayoshi-${target}.zip`)

if (!existsSync(sourceDir)) {
  console.error(`${path.basename(sourceDir)}/ not found. Run npm run build:${target} first.`)
  process.exit(1)
}

rmSync(outputZip, { force: true })

if (process.platform === 'win32') {
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path * -DestinationPath '${outputZip.replace(/'/g, "''")}' -Force`
    ],
    { cwd: sourceDir, stdio: 'inherit' }
  )
} else {
  execFileSync(
    'zip',
    [
      '-r',
      '-X',
      outputZip,
      '.',
      '-x', '**/.DS_Store',
      '-x', '**/__MACOSX/*',
      '-x', '**/._*'
    ],
    { cwd: sourceDir, stdio: 'inherit' }
  )
}

console.log(`Created ${path.relative(root, outputZip)} from ${path.relative(root, sourceDir)}/`)
