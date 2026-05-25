import { failure, success, bindResult, type Result } from '@/shared/result'
import { none, some } from '@/shared/maybe'
import { cond, ifElse } from '@/shared/fp'

import {
  createContextualizedSignal,
  type ContextualizedSignal,
} from '@/contexts/interpretation/model/contextualized-signal'
import {
  createAnomalyNotComputedCaveat,
  createBaselineNotComputedCaveat,
  createInsufficientBaselineHistoryCaveat,
  createTrendNotComputedCaveat,
  type InterpretationCaveat,
} from '@/contexts/interpretation/model/interpretation-caveat'
import type { HistoricalSeries } from '@/contexts/interpretation/model/historical-series'
import {
  createNotComputedAnomalyState,
  type InterpretationAnomalyState,
} from '@/contexts/interpretation/model/anomaly-state'
import type { Baseline, BaselineResult } from '@/contexts/interpretation/model/baseline'
import type { Signal } from '@/contexts/interpretation/model/signal'
import type { Trend } from '@/contexts/interpretation/model/trend'
import type { InterpretationPolicies } from '@/contexts/interpretation/policies'
import type { InterpretationError } from '@/contexts/interpretation/errors'
import { validateHistoricalSeries } from '@/contexts/interpretation/workflows/validate-historical-series'
import { calculateTrend } from '@/contexts/interpretation/workflows/calculate-trend'
import { calculateBaseline } from '@/contexts/interpretation/workflows/calculate-baseline'
import { detectAnomaly } from '@/contexts/interpretation/workflows/detect-anomaly'

type ContextParts = Readonly<{
  readonly trend: Result<Trend, InterpretationError>
  readonly baseline: BaselineResult
  readonly anomaly: InterpretationAnomalyState
  readonly caveats: readonly InterpretationCaveat[]
}>

const trendCaveats = (
  signal: Signal,
  trend: Result<Trend, InterpretationError>,
): readonly InterpretationCaveat[] =>
  ifElse(
    (value: Result<Trend, InterpretationError>) => value.ok,
    () => [],
    () => [createTrendNotComputedCaveat(signal.identity)],
  )(trend)

const baselineCaveats = (
  signal: Signal,
  baseline: BaselineResult,
): readonly InterpretationCaveat[] =>
  ifElse(
    (value: BaselineResult) => value.kind === 'Computed',
    () => [],
    value => [
      createBaselineNotComputedCaveat(signal.identity, value.reason),
      createInsufficientBaselineHistoryCaveat(signal.identity),
    ],
  )(baseline)

const anomalyCaveat = (
  signal: Signal,
  anomaly: InterpretationAnomalyState,
): readonly InterpretationCaveat[] =>
  ifElse(
    (value: InterpretationAnomalyState) => value.kind === 'NotComputed',
    value => [createAnomalyNotComputedCaveat(signal.identity, value.reason)],
    () => [],
  )(anomaly)

const anomalyForBaseline = (
  signal: Signal,
  baseline: BaselineResult,
  policies: InterpretationPolicies,
): Result<InterpretationAnomalyState, InterpretationError> =>
  ifElse(
    (value: BaselineResult): value is Readonly<{ readonly kind: 'Computed'; readonly baseline: Baseline }> => value.kind === 'Computed',
    value => detectAnomaly(signal, value.baseline, policies),
    value => success(createNotComputedAnomalyState(value.reason)),
  )(baseline)

const tolerateTrendFailure = (
  trend: Result<Trend, InterpretationError>,
  policies: InterpretationPolicies,
): Result<Result<Trend, InterpretationError>, InterpretationError> =>
  cond<[Result<Trend, InterpretationError>], Result<Result<Trend, InterpretationError>, InterpretationError>>([
    [
      value => value.ok,
      success,
    ],
    [
      () => policies.historicalCoverage.insufficientHistoryBehavior === 'ReturnNotComputed',
      value => success(value),
    ],
    [
      () => true,
      value => failure(Reflect.get(value, 'error')),
    ],
  ])(trend)

const buildCaveats = (
  signal: Signal,
  trend: Result<Trend, InterpretationError>,
  baseline: BaselineResult,
  anomaly: InterpretationAnomalyState,
): readonly InterpretationCaveat[] => [
  ...trendCaveats(signal, trend),
  ...baselineCaveats(signal, baseline),
  ...anomalyCaveat(signal, anomaly),
]

type BaselineContext = Readonly<{
  readonly trend: Result<Trend, InterpretationError>
  readonly baseline: BaselineResult
}>

const calculateBaselineForSeries = (
  series: HistoricalSeries,
  policies: InterpretationPolicies,
) => (
  toleratedTrend: Result<Trend, InterpretationError>,
): Result<BaselineContext, InterpretationError> =>
  bindResult(calculateBaseline(series, policies), baseline =>
    success({ trend: toleratedTrend, baseline }))

const detectAnomalyForContext = (
  signal: Signal,
  policies: InterpretationPolicies,
) => (
  context: BaselineContext,
): Result<ContextParts, InterpretationError> =>
  bindResult(anomalyForBaseline(signal, context.baseline, policies), anomaly =>
    success({
      trend: context.trend,
      baseline: context.baseline,
      anomaly,
      caveats: buildCaveats(signal, context.trend, context.baseline, anomaly),
    }))

const buildContextParts = (
  signal: Signal,
  series: HistoricalSeries,
  policies: InterpretationPolicies,
): Result<ContextParts, InterpretationError> => {
  const toleratedTrend = tolerateTrendFailure(calculateTrend(signal, series, policies), policies)
  const baselineContext = bindResult(toleratedTrend, calculateBaselineForSeries(series, policies))

  return bindResult(baselineContext, detectAnomalyForContext(signal, policies))
}

const validatedContextualizedSignal = (
  signal: Signal,
  policies: InterpretationPolicies,
) => (
  series: HistoricalSeries,
): Result<ContextualizedSignal, InterpretationError> => {
  const contextParts = buildContextParts(signal, series, policies)

  return bindResult(contextParts, contextualizedResultFor(signal))
}

const contextualizedResultFor = (signal: Signal) => (
  parts: ContextParts,
): Result<ContextualizedSignal, InterpretationError> =>
  success(contextualizedFromParts(signal, parts))


const contextualizedFromParts = (
  signal: Signal,
  parts: ContextParts,
): ContextualizedSignal =>
  createContextualizedSignal(
    signal,
    ifElse(
      (value: Result<Trend, InterpretationError>) => value.ok,
      value => some(value.value),
      none,
    )(parts.trend),
    parts.baseline,
    parts.anomaly,
    parts.caveats,
  )

export const contextualizeFullSignal = (
  signal: Signal,
  series: HistoricalSeries,
  policies: InterpretationPolicies,
): Result<ContextualizedSignal, InterpretationError> => {
  const validated = validateHistoricalSeries(series, policies)

  return bindResult(validated, validatedContextualizedSignal(signal, policies))
}
