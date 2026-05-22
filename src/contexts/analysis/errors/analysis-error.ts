import type { SignalIdentity } from '@/contexts/interpretation/model/signal-identity'

export type AnalysisError =
  | Readonly<{ readonly kind: 'MissingRequiredAnalysisSignal'; readonly missing: 'inventory' | 'price' }>
  | Readonly<{ readonly kind: 'MissingContextualizedSignal'; readonly missing: 'inventory' | 'price' }>
  | Readonly<{ readonly kind: 'InvalidAnalysisPolicy'; readonly reason: string }>
  | Readonly<{ readonly kind: 'UnableToDetermineWalkingSkeletonCondition'; readonly reason: string }>
  | Readonly<{ readonly kind: 'UnableToComposeHeadline'; readonly reason: string }>
  | Readonly<{ readonly kind: 'UnableToComposeSummary'; readonly reason: string }>
  | Readonly<{ readonly kind: 'UnableToComposeExplanation'; readonly reason: string }>
  | Readonly<{ readonly kind: 'ContradictorySignalHandlingFailure'; readonly reason: string }>
  | Readonly<{ readonly kind: 'InsufficientEvidenceForNarrative'; readonly reason: string }>
  | Readonly<{ readonly kind: 'UnexpectedSignalIdentity'; readonly signalIdentity: SignalIdentity }>

export const makeMissingRequiredAnalysisSignalError = (missing: 'inventory' | 'price'): AnalysisError => ({
  kind: 'MissingRequiredAnalysisSignal',
  missing,
})

export const makeMissingContextualizedSignalError = (missing: 'inventory' | 'price'): AnalysisError => ({
  kind: 'MissingContextualizedSignal',
  missing,
})

export const makeInvalidAnalysisPolicyError = (reason: string): AnalysisError => ({
  kind: 'InvalidAnalysisPolicy',
  reason,
})

export const makeUnableToDetermineWalkingSkeletonConditionError = (reason: string): AnalysisError => ({
  kind: 'UnableToDetermineWalkingSkeletonCondition',
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