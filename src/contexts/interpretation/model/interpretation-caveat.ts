import { brand } from '@/shared/domain'
import type { SignalIdentity } from './signal-identity'

const interpretationCaveatBrand = Symbol('InterpretationCaveat')

export type InterpretationCaveat =
  | Readonly<{ readonly kind: 'MissingPreviousObservation'; readonly signalIdentity: SignalIdentity; readonly [interpretationCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'IdentityMismatch'; readonly expectedIdentity: SignalIdentity; readonly actualIdentity: SignalIdentity; readonly [interpretationCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'UnitMismatch'; readonly signalIdentity: SignalIdentity; readonly expectedUnit: string; readonly actualUnit: string; readonly [interpretationCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'TrendNotComputed'; readonly signalIdentity: SignalIdentity; readonly [interpretationCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'BaselineNotComputed'; readonly signalIdentity: SignalIdentity; readonly reason: string; readonly [interpretationCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'AnomalyNotComputed'; readonly signalIdentity: SignalIdentity; readonly reason: string; readonly [interpretationCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'InsufficientBaselineHistory'; readonly signalIdentity: SignalIdentity; readonly [interpretationCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'DuplicateHistoryRejected'; readonly signalIdentity: SignalIdentity; readonly [interpretationCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'UnsupportedComparisonWindow'; readonly signalIdentity: SignalIdentity; readonly [interpretationCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'ComparisonWindowUnavailable'; readonly signalIdentity: SignalIdentity; readonly [interpretationCaveatBrand]: true }>

export const createMissingPreviousObservationCaveat = (signalIdentity: SignalIdentity): InterpretationCaveat => ({
  kind: 'MissingPreviousObservation',
  signalIdentity,
  [interpretationCaveatBrand]: true,
  ...brand(interpretationCaveatBrand),
})

export const createIdentityMismatchCaveat = (
  expectedIdentity: SignalIdentity,
  actualIdentity: SignalIdentity,
): InterpretationCaveat => ({
  kind: 'IdentityMismatch',
  expectedIdentity,
  actualIdentity,
  [interpretationCaveatBrand]: true,
  ...brand(interpretationCaveatBrand),
})

export const createUnitMismatchCaveat = (
  signalIdentity: SignalIdentity,
  expectedUnit: string,
  actualUnit: string,
): InterpretationCaveat => ({
  kind: 'UnitMismatch',
  signalIdentity,
  expectedUnit,
  actualUnit,
  [interpretationCaveatBrand]: true,
  ...brand(interpretationCaveatBrand),
})

export const createTrendNotComputedCaveat = (signalIdentity: SignalIdentity): InterpretationCaveat => ({
  kind: 'TrendNotComputed',
  signalIdentity,
  [interpretationCaveatBrand]: true,
  ...brand(interpretationCaveatBrand),
})

export const createAnomalyNotComputedCaveat = (signalIdentity: SignalIdentity, reason: string): InterpretationCaveat => ({
  kind: 'AnomalyNotComputed',
  signalIdentity,
  reason,
  [interpretationCaveatBrand]: true,
  ...brand(interpretationCaveatBrand),
})

export const createBaselineNotComputedCaveat = (signalIdentity: SignalIdentity, reason: string): InterpretationCaveat => ({
  kind: 'BaselineNotComputed',
  signalIdentity,
  reason,
  [interpretationCaveatBrand]: true,
  ...brand(interpretationCaveatBrand),
})

export const createInsufficientBaselineHistoryCaveat = (signalIdentity: SignalIdentity): InterpretationCaveat => ({
  kind: 'InsufficientBaselineHistory',
  signalIdentity,
  [interpretationCaveatBrand]: true,
  ...brand(interpretationCaveatBrand),
})

export const createDuplicateHistoryRejectedCaveat = (signalIdentity: SignalIdentity): InterpretationCaveat => ({
  kind: 'DuplicateHistoryRejected',
  signalIdentity,
  [interpretationCaveatBrand]: true,
  ...brand(interpretationCaveatBrand),
})

export const createUnsupportedComparisonWindowCaveat = (signalIdentity: SignalIdentity): InterpretationCaveat => ({
  kind: 'UnsupportedComparisonWindow',
  signalIdentity,
  [interpretationCaveatBrand]: true,
  ...brand(interpretationCaveatBrand),
})

export const createComparisonWindowUnavailableCaveat = (signalIdentity: SignalIdentity): InterpretationCaveat => ({
  kind: 'ComparisonWindowUnavailable',
  signalIdentity,
  [interpretationCaveatBrand]: true,
  ...brand(interpretationCaveatBrand),
})
