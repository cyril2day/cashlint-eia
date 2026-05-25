import { bindResult, failure, mapResult, success, type Result } from '@/shared/result'
import { unwrap } from '@/shared/maybe'
import { ifElse } from '@/shared/fp'
import type { ContextualizedSignal } from '@/contexts/interpretation/model/contextualized-signal'
import { createContextualizedSignalWithTrend, createContextualizedSignalWithoutTrend } from '@/contexts/interpretation/model/contextualized-signal'
import { createNotComputedAnomalyState } from '@/contexts/interpretation/model/anomaly-state'
import { createAnomalyNotComputedCaveat, createMissingPreviousObservationCaveat, createTrendNotComputedCaveat } from '@/contexts/interpretation/model/interpretation-caveat'
import type { HistoricalObservation } from '@/contexts/interpretation/model/historical-observation'
import { lookupPreviousObservation, type PreviousObservationMap } from '@/contexts/interpretation/model/previous-observation-map'
import type { Signal } from '@/contexts/interpretation/model/signal'
import { calculateOneWeekTrend } from '@/contexts/interpretation/workflows/calculate-one-week-trend'
import { matchPreviousObservation } from '@/contexts/interpretation/workflows/match-previous-observation'
import { makeMissingPreviousObservationError, type InterpretationError } from '@/contexts/interpretation/errors'
import { type InterpretationPolicies } from '@/contexts/interpretation/policies'

const createContextualizedSignalWithTrendResult =
  (signal: Signal, anomalyContext: NotComputedAnomalyContext) =>
  (trend: Parameters<typeof createContextualizedSignalWithTrend>[1]): ContextualizedSignal =>
    createContextualizedSignalWithTrend(signal, trend, anomalyContext.anomaly, [anomalyContext.anomalyCaveat])

const createNotComputedAnomalyContext = (signal: Signal, policies: InterpretationPolicies) => {
  const anomalyReason = policies.anomalyNotComputedReason

  return {
    anomaly: createNotComputedAnomalyState(anomalyReason),
    anomalyCaveat: createAnomalyNotComputedCaveat(signal.identity, anomalyReason),
  }
}

type NotComputedAnomalyContext = ReturnType<typeof createNotComputedAnomalyContext>

const isMissingPreviousObservationAllowed = (policies: InterpretationPolicies): boolean =>
  policies.allowMissingPreviousObservation === true

const contextualizeTrendForMatchedObservation = (
  signal: Signal,
  policies: InterpretationPolicies,
  matched: HistoricalObservation,
): Result<ContextualizedSignal, InterpretationError> =>
  mapResult(calculateOneWeekTrend(signal, matched, policies), createContextualizedSignalWithTrendResult(signal, createNotComputedAnomalyContext(signal, policies)))

const contextualizeTrendForSignal = (signal: Signal, policies: InterpretationPolicies) => (matched: HistoricalObservation): Result<ContextualizedSignal, InterpretationError> =>
  contextualizeTrendForMatchedObservation(signal, policies, matched)

const contextualizeMatchedObservation = (
  signal: Signal,
  previousObservation: HistoricalObservation,
  policies: InterpretationPolicies,
): Result<ContextualizedSignal, InterpretationError> =>
  bindResult(
    matchPreviousObservation(signal, previousObservation),
    contextualizeTrendForSignal(signal, policies),
  )

const buildMissingPreviousObservationContext = (
  signal: Signal,
  policies: InterpretationPolicies,
): ContextualizedSignal => {
  const anomalyContext = createNotComputedAnomalyContext(signal, policies)

  return createContextualizedSignalWithoutTrend(signal, anomalyContext.anomaly, [
    createMissingPreviousObservationCaveat(signal.identity),
    createTrendNotComputedCaveat(signal.identity),
    anomalyContext.anomalyCaveat,
  ])
}

const createMissingPreviousObservationFailure = (signal: Signal): Result<ContextualizedSignal, InterpretationError> =>
  failure(makeMissingPreviousObservationError(signal.identity))

const handleMissingPreviousObservation = (
  signal: Signal,
  policies: InterpretationPolicies,
): Result<ContextualizedSignal, InterpretationError> =>
  ifElse(
    () => isMissingPreviousObservationAllowed(policies),
    () => success(buildMissingPreviousObservationContext(signal, policies)),
    () => createMissingPreviousObservationFailure(signal),
  )()

export const contextualizeSignal = (
  signal: Signal,
  previousObservations: PreviousObservationMap,
  policies: InterpretationPolicies,
): Result<ContextualizedSignal, InterpretationError> =>
  ifElse(
    (candidate: HistoricalObservation | undefined) => candidate === undefined,
    () => handleMissingPreviousObservation(signal, policies),
    (candidate) => contextualizeMatchedObservation(signal, candidate, policies),
  )(unwrap(lookupPreviousObservation(previousObservations, signal.identity)))
