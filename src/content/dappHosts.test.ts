import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'

const root = path.resolve(__dirname, '../..')

test('the MAIN-world provider script covers exactly the default dApp hosts', () => {
  const source = readFileSync(path.join(root, 'src/content/content-script.ts'), 'utf-8')
  const list = source.match(/const DEFAULT_ALLOWED_HOSTS = \[([^\]]*)\]/)
  expect(list).not.toBeNull()
  const hosts = [...list![1].matchAll(/'([^']+)'/g)].map((m) => m[1])

  const manifest = JSON.parse(readFileSync(path.join(root, 'public/manifest.json'), 'utf-8'))
  const main = manifest.content_scripts.find((entry: { world?: string }) => entry.world === 'MAIN')
  expect(main).toMatchObject({ js: ['assets/inpage.js'], run_at: 'document_start' })
  // "*.example" match patterns also match "example", so "metayoshi.app" needs no own entry.
  const covered = (host: string) => main.matches.some((pattern: string) => {
    const patternHost = pattern.slice('*://'.length, -'/*'.length)
    return patternHost === host || (patternHost.startsWith('*.') && host === patternHost.slice(2))
  })
  for (const host of hosts) expect(covered(host), host).toBe(true)
  expect(main.matches).toHaveLength(hosts.length)
  // The page-world provider is still exposed for the <script> fallback on other hosts.
  expect(manifest.web_accessible_resources[0].resources).toContain('assets/inpage.js')
})
