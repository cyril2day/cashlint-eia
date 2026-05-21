import { formatSignalIdentity, type SignalIdentity } from '@/contexts/interpretation/model/signal-identity'
import { ifElse } from '@/shared/fp'

export type InterpretationError =
  | Readonly<{ readonly kind: 'MissingPreviousObservation'; readonly signalIdentity: SignalIdentity }>
  | Readonly<{ readonly kind: 'SignalIdentityMismatch'; readonly expectedIdentity: SignalIdentity; readonly actualIdentity: SignalIdentity }>
  | Readonly<{ readonly kind: 'IncompatibleUnits'; readonly signalIdentity: SignalIdentity; readonly expectedUnit: string; readonly actualUnit: string }>
  | Readonly<{ readonly kind: 'InvalidComparisonWindow'; readonly input: string }>
  | Readonly<{ readonly kind: 'MissingFlatThreshold'; readonly signalKind: 'Inventory' | 'Price'; readonly signalIdentity: SignalIdentity }>
  | Readonly<{ readonly kind: 'TrendComputationUndefined'; readonly signalIdentity: SignalIdentity }>
  | Readonly<{ readonly kind: 'MissingRequiredSignal'; readonly missing: 'inventory' | 'price' }>

export const makeMissingPreviousObservationError = (signalIdentity: SignalIdentity): InterpretationError => ({
  kind: 'MissingPreviousObservation',
  signalIdentity,
})

export const makeSignalIdentityMismatchError = (
  expectedIdentity: SignalIdentity,
  actualIdentity: SignalIdentity,
): InterpretationError => ({
  kind: 'SignalIdentityMismatch',
  expectedIdentity,
  actualIdentity,
})

export const makeIncompatibleUnitsError = (
  signalIdentity: SignalIdentity,
  expectedUnit: string,
  actualUnit: string,
): InterpretationError => ({
  kind: 'IncompatibleUnits',
  signalIdentity,
  expectedUnit,
  actualUnit,
})

export const makeInvalidComparisonWindowError = (input: unknown): InterpretationError => ({
  kind: 'InvalidComparisonWindow',
  input: String(input),
})

export const makeMissingFlatThresholdError = (
  signalKind: 'Inventory' | 'Price',
  signalIdentity: SignalIdentity,
): InterpretationError => ({
  kind: 'MissingFlatThreshold',
  signalKind,
  signalIdentity,
})

export const makeTrendComputationUndefinedError = (signalIdentity: SignalIdentity): InterpretationError => ({
  kind: 'TrendComputationUndefined',
  signalIdentity,
})

export const makeMissingRequiredSignalError = (missing: 'inventory' | 'price'): InterpretationError => ({
  kind: 'MissingRequiredSignal',
  missing,
})

export const formatInterpretationError = (error: InterpretationError): string =>
  ifElse(
    (candidate: InterpretationError) => candidate.kind === 'MissingPreviousObservation',
    (candidate) => `MissingPreviousObservation:${formatSignalIdentity(candidate.signalIdentity)}`,
    (candidate) => candidate.kind,
  )(error)
