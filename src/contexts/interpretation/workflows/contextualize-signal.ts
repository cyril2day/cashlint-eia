import { bindResult, failure, mapResult, success, type Result } from '@/shared/result'
import { unwrap } from '@/shared/maybe'
import { ifElse } from '@/shared/fp'
import type { ContextualizedSignal } from '../model/contextualized-signal'
import { createContextualizedSignalWithTrend, createContextualizedSignalWithoutTrend } from '../model/contextualized-signal'
import { createNotComputedAnomalyState } from '../model/anomaly-state'
import { createAnomalyNotComputedCaveat, createMissingPreviousObservationCaveat, createTrendNotComputedCaveat } from '../model/interpretation-caveat'
import type { HistoricalObservation } from '../model/historical-observation'
import { lookupPreviousObservation, type PreviousObservationMap } from '../model/previous-observation-map'
import type { Signal } from '../model/signal'
import { calculateOneWeekTrend } from './calculate-one-week-trend'
import { matchPreviousObservation } from './match-previous-observation'
import { makeMissingPreviousObservationError, type InterpretationError } from '../errors'
import { type InterpretationPolicies } from '../policies'

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

const contextualizeTrendForMatchedObservation = (
  signal: Signal,
  policies: InterpretationPolicies,
  matched: HistoricalObservation,
): Result<ContextualizedSignal, InterpretationError> =>
  mapResult(calculateOneWeekTrend(signal, matched, policies), createContextualizedSignalWithTrendResult(signal, createNotComputedAnomalyContext(signal, policies)))

const contextualizeMatchedObservation = (
  signal: Signal,
  previousObservation: HistoricalObservation,
  policies: InterpretationPolicies,
): Result<ContextualizedSignal, InterpretationError> =>
  bindResult(matchPreviousObservation(signal, previousObservation), (matched) =>
    contextualizeTrendForMatchedObservation(signal, policies, matched),
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
    (candidate: boolean) => candidate === true,
    () => success(buildMissingPreviousObservationContext(signal, policies)),
    () => createMissingPreviousObservationFailure(signal),
  )(policies.allowMissingPreviousObservation)

export const contextualizeSignal = (
  signal: Signal,
  previousObservations: PreviousObservationMap,
  policies: InterpretationPolicies,
): Result<ContextualizedSignal, InterpretationError> => {
  const previousObservation = unwrap(lookupPreviousObservation(previousObservations, signal.identity))

  return ifElse(
    (candidate: HistoricalObservation | undefined) => candidate === undefined,
    () => handleMissingPreviousObservation(signal, policies),
    (candidate) => contextualizeMatchedObservation(signal, candidate, policies),
  )(previousObservation)
}
