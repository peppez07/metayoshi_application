import { resolvePublicApiBaseUrl } from './apiBase'
import { callBridgeMethod, type UtxoRpcConfig } from './utxoRpc'

export type RtmIssuerActionKind = 'create_root_asset' | 'create_sub_asset'

export type RtmIssuerAction = {
  version: 1
  kind: RtmIssuerActionKind
  draftId: string
  draftDigest?: string
  networkId: 'rtm'
  assetKind: 'root' | 'sub'
  rootName: string
  subName?: string
  ownerAddress: string
  initialSupply: string
  decimalPoint: number
  maxMintCount: number
  updatable: boolean
  referenceHash: string
  mediaCid?: string
  metadataCid?: string
}

export type RtmIssuerDraftSnapshot = {
  scope: string
  version: 1
  executionMode: 'bridge-createasset' | 'draft-only'
  draftId: string
  networkId: 'rtm'
  assetKind: 'root' | 'sub'
  rootName: string
  subName?: string
  initialSupply: string
  decimalPoint: number
  updatable: boolean
  maxMintCount: number
  ownerAddress: string
  targetAddress: string
  referenceHash: string
  mediaCid?: string
  metadataCid?: string
  digest: string
  status: 'draft' | 'submitted' | 'failed'
}

function getIssuerApiBaseUrl() {
  return resolvePublicApiBaseUrl((import.meta as any)?.env?.VITE_API_BASE_URL)
}

async function fetchIssuerJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getIssuerApiBaseUrl().replace(/\/+$/, '')}${path}`)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(String((body as any)?.error || response.statusText || 'issuer_request_failed'))
  }
  return body as T
}

function assertEqualString(actual: unknown, expected: unknown, label: string) {
  const left = String(actual ?? '').trim()
  const right = String(expected ?? '').trim()
  if (left !== right) throw new Error(`${label}_mismatch`)
}

function assertEqualNumber(actual: unknown, expected: unknown, label: string) {
  if (Number(actual) !== Number(expected)) throw new Error(`${label}_mismatch`)
}

export async function loadRtmIssuerDraft(draftId: string): Promise<RtmIssuerDraftSnapshot> {
  return await fetchIssuerJson<RtmIssuerDraftSnapshot>(`/v1/market/rtm/issuer/drafts/${encodeURIComponent(draftId)}`)
}

export function assertRtmIssuerActionMatchesDraft(action: RtmIssuerAction, draft: RtmIssuerDraftSnapshot): void {
  assertEqualString(action.draftId, draft.draftId, 'draft_id')
  if (action.draftDigest) {
    assertEqualString(action.draftDigest, draft.digest, 'draft_digest')
  }
  assertEqualString(action.networkId, draft.networkId, 'network_id')
  assertEqualString(action.assetKind, draft.assetKind, 'asset_kind')
  assertEqualString(action.rootName, draft.rootName, 'root_name')
  assertEqualString(action.subName || '', draft.subName || '', 'sub_name')
  assertEqualString(action.ownerAddress, draft.ownerAddress, 'owner_address')
  assertEqualString(action.initialSupply, draft.initialSupply, 'initial_supply')
  assertEqualNumber(action.decimalPoint, draft.decimalPoint, 'decimal_point')
  assertEqualNumber(action.maxMintCount, draft.maxMintCount, 'max_mint_count')
  if (Boolean(action.updatable) !== Boolean(draft.updatable)) throw new Error('updatable_mismatch')
  assertEqualString(action.referenceHash, draft.referenceHash, 'reference_hash')
  assertEqualString(action.mediaCid || '', draft.mediaCid || '', 'media_cid')
  assertEqualString(action.metadataCid || '', draft.metadataCid || '', 'metadata_cid')
}

export async function verifyRtmIssuerAction(action: RtmIssuerAction): Promise<RtmIssuerDraftSnapshot> {
  const draft = await loadRtmIssuerDraft(action.draftId)
  assertRtmIssuerActionMatchesDraft(action, draft)
  return draft
}

export async function executeRtmIssuerAction(params: {
  action: RtmIssuerAction
  rpcConfig: UtxoRpcConfig
}): Promise<{ hash: string; txid: string; payload: Record<string, unknown> }> {
  const draft = await verifyRtmIssuerAction(params.action)
  if (draft.executionMode !== 'bridge-createasset') {
    throw new Error('issuer_execution_unavailable')
  }

  const payload: Record<string, unknown> = {
    name: draft.assetKind === 'root' ? draft.rootName : String(draft.subName || ''),
    updatable: draft.updatable,
    is_root: draft.assetKind === 'root',
    isunique: false,
    decimalpoint: draft.decimalPoint,
    referenceHash: draft.referenceHash,
    maxMintCount: draft.maxMintCount,
    type: 0,
    targetAddress: draft.targetAddress,
    amount: draft.initialSupply,
    ownerAddress: draft.ownerAddress,
  }
  if (draft.assetKind === 'sub') {
    payload['root_name'] = draft.rootName
  }

  const txid = String(await callBridgeMethod(params.rpcConfig, 'createasset', [payload]) || '').trim()
  if (!txid) throw new Error('createasset_txid_missing')
  return {
    hash: txid,
    txid,
    payload,
  }
}
