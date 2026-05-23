export type PresentationCaveatKind =
  | 'full-system-balance-not-computed'
  | 'refinery-data-not-included'
  | 'supply-data-not-included'
  | 'missing-previous-observation'
  | 'identity-mismatch'
  | 'unit-mismatch'
  | 'trend-not-computed'
  | 'anomaly-not-computed'
  | 'comparison-window-unavailable'

export type PresentationCaveatSeverity = 'info' | 'warning'

export type PresentationCaveatViewModel = Readonly<{
  readonly kind: PresentationCaveatKind
  readonly title: string
  readonly message: string
  readonly severity: PresentationCaveatSeverity
}>