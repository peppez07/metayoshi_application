const logoModules = import.meta.glob('./*.{png,webp}', {
  eager: true,
  import: 'default'
}) as Record<string, string>

function splitAssetName(name: string): { root: string; sub: string | null } {
  const pipeIdx = name.indexOf('|')
  if (pipeIdx >= 0) return { root: name.slice(0, pipeIdx).trim(), sub: name.slice(pipeIdx + 1).trim() || null }
  const slashIdx = name.indexOf('/')
  if (slashIdx >= 0) return { root: name.slice(0, slashIdx).trim(), sub: name.slice(slashIdx + 1).trim() || null }
  return { root: name.trim(), sub: null }
}

function variantsOf(value: string): string[] {
  const trimmed = String(value || '').trim()
  if (!trimmed) return []
  const lower = trimmed.toLowerCase()
  const compact = lower.replace(/[^a-z0-9]/g, '')
  const dashed = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const underscored = lower.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return Array.from(new Set([lower, compact, dashed, underscored].filter(Boolean)))
}

const logoByKey = new Map<string, string>()
for (const [path, src] of Object.entries(logoModules)) {
  const filename = path.split('/').pop() || ''
  const stem = filename.replace(/\.(png|webp)$/i, '')
  for (const key of variantsOf(stem)) {
    if (!logoByKey.has(key)) logoByKey.set(key, src)
  }
}

export function getTokenLogoForAsset(assetName: string): string | null {
  const raw = String(assetName || '').trim()
  if (!raw) return null
  const parsed = splitAssetName(raw)
  const candidates = [raw, parsed.sub || '', parsed.root]
  for (const candidate of candidates) {
    for (const key of variantsOf(candidate)) {
      const match = logoByKey.get(key)
      if (match) return match
    }
  }
  return null
}
