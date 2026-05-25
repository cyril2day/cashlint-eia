import type { SignalIdentity } from '@/contexts/interpretation/model/signal-identity'

export type AnalysisError =
  | Readonly<{ readonly kind: 'MissingRequiredAnalysisSignal'; readonly missing: 'inventory' | 'price' }>
  | Readonly<{ readonly kind: 'MissingContextualizedSignal'; readonly missing: 'inventory' | 'price' }>
  | Readonly<{ readonly kind: 'MissingSystemBalanceAnalysis'; readonly reason: string }>
  | Readonly<{ readonly kind: 'InvalidAnalysisPolicy'; readonly reason: string }>
  | Readonly<{ readonly kind: 'UnableToDetermineCoreWeeklyCondition'; readonly reason: string }>
  | Readonly<{ readonly kind: 'UnableToComposeHeadline'; readonly reason: string }>
  | Readonly<{ readonly kind: 'UnableToComposeSummary'; readonly reason: string }>
  | Readonly<{ readonly kind: 'UnableToComposeExplanation'; readonly reason: string }>
  | Readonly<{ readonly kind: 'ContradictorySignalHandlingFailure'; readonly reason: string }>
  | Readonly<{ readonly kind: 'InsufficientEvidenceForNarrative'; readonly reason: string }>
  | Readonly<{ readonly kind: 'UnexpectedSignalIdentity'; readonly signalIdentity: SignalIdentity }>
  | Readonly<{ readonly kind: 'UnableToDetermineFullAnalysisCondition'; readonly reason: string }>
  | Readonly<{ readonly kind: 'UnableToSelectKeyDrivers'; readonly reason: string }>
  | Readonly<{ readonly kind: 'UnableToComposeHistoricalQualification'; readonly reason: string }>
  | Readonly<{ readonly kind: 'UnableToComposeFullAnalysis'; readonly reason: string }>
  | Readonly<{ readonly kind: 'UnsupportedBalanceState'; readonly input: string }>

export const makeMissingRequiredAnalysisSignalError = (missing: 'inventory' | 'price'): AnalysisError => ({
  kind: 'MissingRequiredAnalysisSignal',
  missing,
})

export const makeMissingContextualizedSignalError = (missing: 'inventory' | 'price'): AnalysisError => ({
  kind: 'MissingContextualizedSignal',
  missing,
})

export const makeMissingSystemBalanceAnalysisError = (reason: string): AnalysisError => ({
  kind: 'MissingSystemBalanceAnalysis',
  reason,
})

export const makeInvalidAnalysisPolicyError = (reason: string): AnalysisError => ({
  kind: 'InvalidAnalysisPolicy',
  reason,
})

export const makeUnableToDetermineCoreWeeklyConditionError = (reason: string): AnalysisError => ({
  kind: 'UnableToDetermineCoreWeeklyCondition',
  reason,
})

export const makeUnableToComposeHeadlineError = (reason: string): AnalysisError => ({
  kind: 'UnableToComposeHeadline',
  reason,
})

export const makeUnableToComposeSummaryError = (reason: string): AnalysisError => ({
  kind: 'UnableToComposeSummary',
  reason,
})

export const makeUnableToComposeExplanationError = (reason: string): AnalysisError => ({
  kind: 'UnableToComposeExplanation',
  reason,
})

export const makeContradictorySignalHandlingFailureError = (reason: string): AnalysisError => ({
  kind: 'ContradictorySignalHandlingFailure',
  reason,
})

export const makeInsufficientEvidenceForNarrativeError = (reason: string): AnalysisError => ({
  kind: 'InsufficientEvidenceForNarrative',
  reason,
})

export const makeUnexpectedSignalIdentityError = (signalIdentity: SignalIdentity): AnalysisError => ({
  kind: 'UnexpectedSignalIdentity',
  signalIdentity,
})

export const makeUnableToDetermineFullAnalysisConditionError = (reason: string): AnalysisError => ({
  kind: 'UnableToDetermineFullAnalysisCondition',
  reason,
})

export const makeUnableToSelectKeyDriversError = (reason: string): AnalysisError => ({
  kind: 'UnableToSelectKeyDrivers',
  reason,
})

export const makeUnableToComposeHistoricalQualificationError = (reason: string): AnalysisError => ({
  kind: 'UnableToComposeHistoricalQualification',
  reason,
})

export const makeUnableToComposeFullAnalysisError = (reason: string): AnalysisError => ({
  kind: 'UnableToComposeFullAnalysis',
  reason,
})

export const makeUnsupportedBalanceStateError = (input: string): AnalysisError => ({
  kind: 'UnsupportedBalanceState',
  input,
})