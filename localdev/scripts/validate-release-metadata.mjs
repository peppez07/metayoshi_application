import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const walletRoot = path.resolve(__dirname, '..')
const websiteRoot = path.resolve(walletRoot, '..', '..', 'metayoshi_SERVER', '_server_support', 'website')

const failures = []

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function readJson(filePath) {
  return JSON.parse(readFile(filePath))
}

function assert(condition, message) {
  if (!condition) failures.push(message)
}

function extractTsConst(source, name) {
  const match = source.match(new RegExp(`export const ${name} = ['"]([^'"]+)['"]`))
  return match ? match[1] : null
}

function extractObjectString(source, key) {
  const match = source.match(new RegExp(`${key}:\\s*"([^"]+)"`))
  return match ? match[1] : null
}

function hasPlaceholderText(value) {
  return /example\.(com|org|net)|placeholder|replace me|replace these|changeme|your-email|support@example|security@example/i.test(value)
}

const walletPackagePath = path.join(walletRoot, 'package.json')
const manifestPath = path.join(walletRoot, 'public', 'manifest.json')
const legalMetadataPath = path.join(walletRoot, 'src', 'lib', 'legalMetadata.ts')
const unlockPath = path.join(walletRoot, 'src', 'pages', 'Unlock.tsx')
const securityDocPath = path.join(walletRoot, 'SECURITY.md')
const readmePath = path.join(walletRoot, 'README.md')
const websiteSiteConfigPath = path.join(websiteRoot, 'client', 'src', 'content', 'site.ts')

assert(fs.existsSync(walletPackagePath), `Missing wallet package metadata: ${walletPackagePath}`)
assert(fs.existsSync(manifestPath), `Missing manifest metadata: ${manifestPath}`)
assert(fs.existsSync(legalMetadataPath), `Missing wallet legal metadata: ${legalMetadataPath}`)
assert(fs.existsSync(websiteSiteConfigPath), `Missing website site metadata: ${websiteSiteConfigPath}`)
assert(fs.existsSync(securityDocPath), `Missing SECURITY.md: ${securityDocPath}`)

if (failures.length === 0) {
  const walletPackage = readJson(walletPackagePath)
  const manifest = readJson(manifestPath)
  const legalMetadata = readFile(legalMetadataPath)
  const unlockSource = readFile(unlockPath)
  const securityDoc = readFile(securityDocPath)
  const readme = readFile(readmePath)
  const websiteSiteConfig = readFile(websiteSiteConfigPath)

  const walletVersion = String(walletPackage.version || '').trim()
  const expectedVersionName = `metayoshi-${walletVersion}`
  const walletVersionConst = extractTsConst(legalMetadata, 'WALLET_VERSION')
  const walletSupportEmail = extractTsConst(legalMetadata, 'METAYOSHI_SUPPORT_EMAIL')
  const walletSecurityEmail = extractTsConst(legalMetadata, 'METAYOSHI_SECURITY_EMAIL')
  const walletPrivacyUrl = extractTsConst(legalMetadata, 'METAYOSHI_PRIVACY_URL')
  const walletTermsUrl = extractTsConst(legalMetadata, 'METAYOSHI_TERMS_URL')
  const walletOperatorName = extractTsConst(legalMetadata, 'METAYOSHI_OPERATOR_NAME')
  const walletTermsVersion = extractTsConst(legalMetadata, 'WALLET_TERMS_VERSION')

  const siteOperatorName = extractObjectString(websiteSiteConfig, 'operatorName')
  const siteSupportEmail = extractObjectString(websiteSiteConfig, 'supportEmail')
  const siteSecurityEmail = extractObjectString(websiteSiteConfig, 'securityEmail')
  const sitePrivacyRequestEmail = extractObjectString(websiteSiteConfig, 'privacyRequestEmail')
  const siteTermsLastUpdated = extractObjectString(websiteSiteConfig, 'termsLastUpdated')
  const sitePrivacyLastUpdated = extractObjectString(websiteSiteConfig, 'privacyLastUpdated')
  const siteWalletVersion = extractObjectString(websiteSiteConfig, 'walletVersion')
  const siteWalletVersionName = extractObjectString(websiteSiteConfig, 'walletVersionName')

  assert(Boolean(walletVersion), 'Wallet package version is missing.')
  assert(manifest.version === walletVersion, `Manifest version mismatch: expected ${walletVersion}, found ${manifest.version}.`)
  assert(manifest.version_name === expectedVersionName, `Manifest version_name mismatch: expected ${expectedVersionName}, found ${manifest.version_name}.`)
  assert(walletVersionConst === walletVersion, `legalMetadata WALLET_VERSION mismatch: expected ${walletVersion}, found ${walletVersionConst}.`)
  assert(legalMetadata.includes('export const WALLET_VERSION_NAME = `metayoshi-${WALLET_VERSION}`'), 'legalMetadata WALLET_VERSION_NAME must derive from WALLET_VERSION.')
  assert(siteWalletVersion === walletVersion, `Website walletVersion mismatch: expected ${walletVersion}, found ${siteWalletVersion}.`)
  assert(siteWalletVersionName === expectedVersionName, `Website walletVersionName mismatch: expected ${expectedVersionName}, found ${siteWalletVersionName}.`)
  assert(unlockSource.includes('WALLET_VERSION_NAME'), 'Unlock screen version fallback must reuse WALLET_VERSION_NAME.')

  for (const [label, value] of [
    ['METAYOSHI_SUPPORT_EMAIL', walletSupportEmail],
    ['METAYOSHI_SECURITY_EMAIL', walletSecurityEmail],
    ['METAYOSHI_PRIVACY_URL', walletPrivacyUrl],
    ['METAYOSHI_TERMS_URL', walletTermsUrl],
    ['METAYOSHI_OPERATOR_NAME', walletOperatorName],
    ['WALLET_TERMS_VERSION', walletTermsVersion],
    ['siteConfig.operatorName', siteOperatorName],
    ['siteConfig.supportEmail', siteSupportEmail],
    ['siteConfig.securityEmail', siteSecurityEmail],
    ['siteConfig.privacyRequestEmail', sitePrivacyRequestEmail],
    ['siteConfig.termsLastUpdated', siteTermsLastUpdated],
    ['siteConfig.privacyLastUpdated', sitePrivacyLastUpdated]
  ]) {
    assert(Boolean(String(value || '').trim()), `${label} is missing.`)
    assert(!hasPlaceholderText(String(value || '')), `${label} still contains placeholder text: ${value}`)
  }

  assert(walletSecurityEmail !== walletSupportEmail, 'Wallet security email must be distinct from the support inbox.')
  assert(siteSecurityEmail !== siteSupportEmail, 'Website security email must be distinct from the support inbox.')
  assert(securityDoc.includes(String(walletSecurityEmail)), 'SECURITY.md must publish the configured security email.')
  assert(securityDoc.includes(String(walletSupportEmail)), 'SECURITY.md must publish the configured support email.')

  const broadHostAccess = [
    ...(manifest.host_permissions || []),
    ...((manifest.content_scripts || []).flatMap((entry) => entry.matches || [])),
    ...((manifest.web_accessible_resources || []).flatMap((entry) => entry.matches || []))
  ].some((entry) => entry === 'http://*/*' || entry === 'https://*/*')

  if (broadHostAccess) {
    assert(readme.includes('Extension permissions and page access'), 'README must disclose broad extension page access.')
    assert(/broad http and https page access/i.test(websiteSiteConfig), 'Website policy content must disclose broad extension page access.')
  }
}

if (failures.length > 0) {
  console.error('Release metadata validation failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Release metadata validation passed.')
