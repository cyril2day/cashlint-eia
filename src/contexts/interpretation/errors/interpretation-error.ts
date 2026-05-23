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
  | Readonly<{ readonly kind: 'HistoricalSeriesInvalid'; readonly signalIdentity: SignalIdentity; readonly input: string }>
  | Readonly<{ readonly kind: 'InsufficientHistory'; readonly signalIdentity: SignalIdentity; readonly required: number; readonly actual: number }>
  | Readonly<{ readonly kind: 'BaselineWindowTooShort'; readonly signalIdentity: SignalIdentity; readonly required: number; readonly actual: number }>
  | Readonly<{ readonly kind: 'BaselineDispersionUnavailable'; readonly signalIdentity: SignalIdentity }>
  | Readonly<{ readonly kind: 'AnomalyThresholdInvalid'; readonly signalIdentity: SignalIdentity; readonly input: string }>
  | Readonly<{ readonly kind: 'UnsupportedComparisonWindow'; readonly input: string }>
  | Readonly<{ readonly kind: 'DuplicateObservation'; readonly signalIdentity: SignalIdentity; readonly input: string }>
  | Readonly<{ readonly kind: 'UnableToContextualizeSignal'; readonly signalIdentity: SignalIdentity }>

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

export const makeHistoricalSeriesInvalidError = (
  signalIdentity: SignalIdentity,
  input: string,
): InterpretationError => ({
  kind: 'HistoricalSeriesInvalid',
  signalIdentity,
  input,
})

export const makeInsufficientHistoryError = (
  signalIdentity: SignalIdentity,
  required: number,
  actual: number,
): InterpretationError => ({
  kind: 'InsufficientHistory',
  signalIdentity,
  required,
  actual,
})

export const makeBaselineWindowTooShortError = (
  signalIdentity: SignalIdentity,
  required: number,
  actual: number,
): InterpretationError => ({
  kind: 'BaselineWindowTooShort',
  signalIdentity,
  required,
  actual,
})

export const makeBaselineDispersionUnavailableError = (signalIdentity: SignalIdentity): InterpretationError => ({
  kind: 'BaselineDispersionUnavailable',
  signalIdentity,
})

export const makeAnomalyThresholdInvalidError = (
  signalIdentity: SignalIdentity,
  input: string,
): InterpretationError => ({
  kind: 'AnomalyThresholdInvalid',
  signalIdentity,
  input,
})

export const makeUnsupportedComparisonWindowError = (input: unknown): InterpretationError => ({
  kind: 'UnsupportedComparisonWindow',
  input: String(input),
})

export const makeDuplicateObservationError = (
  signalIdentity: SignalIdentity,
  input: string,
): InterpretationError => ({
  kind: 'DuplicateObservation',
  signalIdentity,
  input,
})

export const makeUnableToContextualizeSignalError = (signalIdentity: SignalIdentity): InterpretationError => ({
  kind: 'UnableToContextualizeSignal',
  signalIdentity,
})

export const formatInterpretationError = (error: InterpretationError): string =>
  ifElse(
    (candidate: InterpretationError) => candidate.kind === 'MissingPreviousObservation',
    (candidate) => `MissingPreviousObservation:${formatSignalIdentity(candidate.signalIdentity)}`,
    (candidate) => candidate.kind,
  )(error)
