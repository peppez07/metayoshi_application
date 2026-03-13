export type ResearchCatalogAssetPlatform = {
  platformId: string
  contractAddress: string
}

export type ResearchCatalogAsset = {
  rank: number
  geckoId: string
  symbol: string
  name: string
  catalogType: 'native' | 'token'
  hostRuntime?: string | null
  walletRuntimeHint?: string | null
  algorithm?: string | null
  proofType?: string | null
  assetLaunchDate?: string | null
  imageUrl?: string | null
  descriptionPreview?: string | null
  assetPlatforms?: ResearchCatalogAssetPlatform[]
  segments?: string[]
  taxonomy?: Record<string, unknown>
  source?: Record<string, unknown>
}

export type ResearchCatalogSnapshot = {
  generatedAt: string
  source: string
  selectionRule: string
  notes?: string[]
  summary?: Record<string, unknown>
  assets: ResearchCatalogAsset[]
}

export const RESEARCH_TOP100_CATALOG_SNAPSHOT: ResearchCatalogSnapshot = {
  generatedAt: '1970-01-01T00:00:00.000Z',
  source: 'bundled-empty',
  selectionRule: 'none',
  notes: ['Research snapshot removed from the public app bundle.'],
  assets: []
}
