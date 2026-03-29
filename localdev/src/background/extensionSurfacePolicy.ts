export type ExtensionSurfacePolicyKind = 'approval' | 'request' | 'wallet'

export type ExtensionSurfaceOpenPolicy = {
  fallbackToTabOnSidePanelFailure: boolean
  preferPopupWindow: boolean
}

const STRICT_SIDE_PANEL_ONLY_POLICY: ExtensionSurfaceOpenPolicy = {
  fallbackToTabOnSidePanelFailure: false,
  preferPopupWindow: false
}

export function getExtensionSurfaceOpenPolicy(_kind: ExtensionSurfacePolicyKind): ExtensionSurfaceOpenPolicy {
  return STRICT_SIDE_PANEL_ONLY_POLICY
}
