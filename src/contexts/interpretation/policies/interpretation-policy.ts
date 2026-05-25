import type { Decimal } from '@/shared/decimal'
import type { ComparisonWindow } from '@/contexts/measurement/model/comparison-window'
import type { SignalIdentity } from '@/contexts/interpretation/model/signal-identity'

export type InterpretationPolicies = Readonly<{
  readonly comparisonWindow: ComparisonWindow
  readonly supportedComparisonWindows: readonly ComparisonWindow['window'][]
  readonly flatThresholds: Readonly<{
    readonly inventory: Decimal
    readonly price: Decimal
    readonly refinery: Decimal
    readonly supply: Decimal
    readonly balance: Decimal
  }>
  readonly historicalCoverage: HistoricalCoveragePolicy
  readonly baseline: BaselinePolicy
  readonly anomaly: AnomalyPolicy
  readonly signalSpecificPolicies: readonly SignalSpecificInterpretationPolicy[]
  readonly anomalyNotComputedReason: string
  readonly allowMissingPreviousObservation: boolean
}>

export type InsufficientHistoryBehavior = 'ReturnNotComputed' | 'ReturnError'

export type HistoricalCoveragePolicy = Readonly<{
  readonly minimumTrendObservations: number
  readonly minimumBaselineObservations: number
  readonly minimumAnomalyObservations: number
  readonly insufficientHistoryBehavior: InsufficientHistoryBehavior
}>

export type BaselinePolicy = Readonly<{
  readonly windowObservations: number
  readonly minimumObservations: number
  readonly insufficientHistoryBehavior: InsufficientHistoryBehavior
}>

export type AnomalyPolicy = Readonly<{
  readonly zScoreThreshold: Decimal
  readonly minimumBaselineObservations: number
  readonly zeroDispersionBehavior: InsufficientHistoryBehavior
}>

export type SignalSpecificInterpretationPolicy = Readonly<{
  readonly signalKind: SignalIdentity['kind']
  readonly flatThreshold: Decimal
  readonly anomalyThreshold: Decimal
  readonly baselineWindowObservations: number
}>

export const createCoreWeeklyInterpretationPolicies = (
  comparisonWindow: ComparisonWindow,
  inventoryFlatThreshold: Decimal,
  priceFlatThreshold: Decimal,
  allowMissingPreviousObservation = true,
  anomalyNotComputedReason = 'NotComputed',
): InterpretationPolicies => ({
  comparisonWindow,
  supportedComparisonWindows: ['OneWeek', 'TwoWeek', 'FourWeek'],
  flatThresholds: {
    inventory: inventoryFlatThreshold,
    price: priceFlatThreshold,
    refinery: inventoryFlatThreshold,
    supply: inventoryFlatThreshold,
    balance: inventoryFlatThreshold,
  },
  historicalCoverage: {
    minimumTrendObservations: 1,
    minimumBaselineObservations: 4,
    minimumAnomalyObservations: 4,
    insufficientHistoryBehavior: 'ReturnNotComputed',
  },
  baseline: {
    windowObservations: 52,
    minimumObservations: 4,
    insufficientHistoryBehavior: 'ReturnNotComputed',
  },
  anomaly: {
    zScoreThreshold: 2,
    minimumBaselineObservations: 4,
    zeroDispersionBehavior: 'ReturnNotComputed',
  },
  signalSpecificPolicies: [
    {
      signalKind: 'Inventory',
      flatThreshold: inventoryFlatThreshold,
      anomalyThreshold: 2,
      baselineWindowObservations: 52,
    },
    {
      signalKind: 'Price',
      flatThreshold: priceFlatThreshold,
      anomalyThreshold: 2,
      baselineWindowObservations: 52,
    },
  ],
  anomalyNotComputedReason,
  allowMissingPreviousObservation,
})
