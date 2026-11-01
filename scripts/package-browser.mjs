import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

function parseCsvList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const target = String(process.argv[2] || '').trim().toLowerCase()
if (!target || !['chromium', 'firefox'].includes(target)) {
  console.error('Usage: node scripts/package-browser.mjs <chromium|firefox>')
  process.exit(1)
}

const root = process.cwd()
const srcDist = path.join(root, 'dist')
if (!existsSync(srcDist)) {
  console.error('dist/ not found. Run npm run build first.')
  process.exit(1)
}

const outDir = path.join(root, target === 'firefox' ? 'dist-firefox' : 'dist-chromium')
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })
cpSync(srcDist, outDir, { recursive: true })

// The provider runs as a classic script in the page's own world; wrap it so its
// top-level names cannot collide with the page's globals.
const inpagePath = path.join(outDir, 'assets', 'inpage.js')
const inpage = readFileSync(inpagePath, 'utf-8')
if (/^\s*(import|export)\s/m.test(inpage)) {
  console.error('assets/inpage.js must be a self-contained script (no import/export).')
  process.exit(1)
}
if (!inpage.startsWith('(()=>{')) writeFileSync(inpagePath, `(()=>{${inpage}\n})();\n`, 'utf-8')

const baseManifestPath = path.join(root, 'public', 'manifest.json')
const manifest = JSON.parse(readFileSync(baseManifestPath, 'utf-8'))

// The wallet opens beside the page, like Uniswap's extension: the right-hand side
// panel in Chrome/Edge, the sidebar in Firefox. Alt+Shift+M opens it; users can
// change the key at chrome://extensions/shortcuts or about:addons.
const SIDE_PANEL_PATH = 'app/src/ui/index.html?view=sidepanel'
const SHORTCUT = { default: 'Alt+Shift+M', mac: 'Alt+Shift+M' }

if (target === 'chromium') {
  // Firefox-only metadata should never appear in Chromium packages.
  delete manifest.browser_specific_settings
  manifest.permissions = Array.from(new Set([...(manifest.permissions || []), 'sidePanel']))
  manifest.side_panel = { default_path: SIDE_PANEL_PATH }
  manifest.commands = {
    ...(manifest.commands || {}),
    _execute_action: { suggested_key: SHORTCUT, description: 'Open MetaYoshi' }
  }
}

if (target === 'firefox') {
  const requiredPermissions = parseCsvList(process.env.FIREFOX_DATA_COLLECTION_REQUIRED)
  const optionalPermissions = parseCsvList(process.env.FIREFOX_DATA_COLLECTION_OPTIONAL)
  const normalizedRequired = requiredPermissions.includes('none') && requiredPermissions.length > 1
    ? requiredPermissions.filter((permission) => permission !== 'none')
    : requiredPermissions

  // Firefox-specific metadata for AMO/self-hosted signing.
  manifest.browser_specific_settings = {
    gecko: {
      id: process.env.FIREFOX_EXTENSION_ID || 'metayoshi@metayoshi.app',
      strict_min_version: process.env.FIREFOX_MIN_VERSION || '142.0',
      data_collection_permissions: {
        required: normalizedRequired.length > 0 ? normalizedRequired : ['none'],
        optional: optionalPermissions
      }
    }
  }

  // Chromium-only key; keep Firefox manifest clean.
  delete manifest.externally_connectable

  manifest.sidebar_action = {
    default_panel: SIDE_PANEL_PATH,
    default_title: 'MetaYoshi',
    default_icon: manifest.action?.default_icon ?? manifest.icons,
    open_at_install: false
  }
  manifest.commands = {
    ...(manifest.commands || {}),
    _execute_sidebar_action: { suggested_key: SHORTCUT, description: 'Open MetaYoshi' }
  }

  // Some Firefox channels/configurations still reject MV3 service workers
  // for temporary add-on installs. Fall back to background.scripts.
  if (manifest.background?.service_worker) {
    manifest.background = {
      scripts: [manifest.background.service_worker],
      type: manifest.background.type
    }
  }
}

const outManifestPath = path.join(outDir, 'manifest.json')
writeFileSync(outManifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')

console.log(`Packed ${target} build -> ${path.relative(root, outDir)}`)
