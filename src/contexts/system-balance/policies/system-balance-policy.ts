import type { BalanceCaveatKind } from '@/contexts/system-balance/model/system-balance-analysis'
import type { BalanceConfidenceLevel } from '@/contexts/system-balance/model/system-balance-analysis'

export type MissingEvidenceBehavior = 'ReturnUnknown' | 'ReturnError'

export type SystemBalancePolicy = Readonly<{
  readonly inventoryFlatTolerance: number
  readonly supplyPressureNeutralTolerance: number
  readonly driverMaterialityTolerance: number
  readonly missingEvidenceBehavior: MissingEvidenceBehavior
  readonly requireSimplifiedCrudeBalanceCaveat: boolean
  readonly includeRateComparisonCaveat: boolean
  readonly partialGeographyCaveatGeographies: readonly string[]
  readonly caveatConfidencePenalty: Partial<Record<BalanceCaveatKind, BalanceConfidenceLevel>>
}>

export const defaultSystemBalancePolicy: SystemBalancePolicy = {
  inventoryFlatTolerance: 1,
  supplyPressureNeutralTolerance: 0.25,
  driverMaterialityTolerance: 0.5,
  missingEvidenceBehavior: 'ReturnUnknown',
  requireSimplifiedCrudeBalanceCaveat: true,
  includeRateComparisonCaveat: false,
  partialGeographyCaveatGeographies: [],
  caveatConfidencePenalty: {
    MixedSignalDirection: 'Medium',
    MissingOptionalComponent: 'Medium',
    UnknownStateDueToMissingEvidence: 'Low',
    RateToStockComparisonLimitation: 'Medium',
    PartialGeographyCoverage: 'Medium',
  },
}
