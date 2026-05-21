import type { Decimal } from '@/shared/decimal'
import type { ComparisonWindow } from '@/contexts/measurement/model/comparison-window'

export type InterpretationPolicies = Readonly<{
  readonly comparisonWindow: ComparisonWindow
  readonly flatThresholds: Readonly<{
    readonly inventory: Decimal
    readonly price: Decimal
  }>
  readonly anomalyNotComputedReason: string
  readonly allowMissingPreviousObservation: boolean
}>

export const createWalkingSkeletonInterpretationPolicies = (
  comparisonWindow: ComparisonWindow,
  inventoryFlatThreshold: Decimal,
  priceFlatThreshold: Decimal,
  allowMissingPreviousObservation = true,
  anomalyNotComputedReason = 'NotComputed',
): InterpretationPolicies => ({
  comparisonWindow,
  flatThresholds: {
    inventory: inventoryFlatThreshold,
    price: priceFlatThreshold,
  },
  anomalyNotComputedReason,
  allowMissingPreviousObservation,
})
