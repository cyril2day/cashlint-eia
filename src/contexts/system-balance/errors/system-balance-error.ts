export type SystemBalanceErrorKind =
  | 'MissingCurrentWeeklyFacts'
  | 'MissingPreviousWeeklyFacts'
  | 'MissingCurrentInventory'
  | 'MissingPreviousInventory'
  | 'MissingRefineryDemandComponent'
  | 'MissingProduction'
  | 'MissingImports'
  | 'MissingExports'
  | 'MissingSupply'
  | 'IncompatibleUnits'
  | 'ReportWeekMismatch'
  | 'GeographyMismatch'
  | 'BalancePolicyInvalid'
  | 'UnsupportedBalanceComponent'
  | 'UnableToClassifyBalanceState'

export type SystemBalanceError = Readonly<{
  readonly kind: SystemBalanceErrorKind
  readonly input: string
}>

export const createSystemBalanceError = (
  kind: SystemBalanceErrorKind,
  input: string,
): SystemBalanceError => ({
  kind,
  input,
})
