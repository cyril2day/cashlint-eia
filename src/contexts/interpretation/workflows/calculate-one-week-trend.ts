import { failure, success, type Result } from '@/shared/result'
import { cond, ifElse } from '@/shared/fp'
import type { TrendDirection } from '@/contexts/measurement/model/trend-direction'
import { parseTrendDirection } from '@/contexts/measurement/model/trend-direction'
import type { HistoricalObservation } from '../model/historical-observation'
import { createTrend, type Trend } from '../model/trend'
import type { Signal } from '../model/signal'
import { type InterpretationPolicies } from '../policies'
import { makeInvalidComparisonWindowError, makeTrendComputationUndefinedError, type InterpretationError } from '../errors'

function handleUnexpectedTrendDirectionParseFailure(): never {
  throw new Error('unexpected trend direction parse failure')
}

const unwrapTrendDirection = (direction: TrendDirection['direction']): TrendDirection =>
  ifElse(
    (candidate: ReturnType<typeof parseTrendDirection>) => candidate.ok === true,
    (candidate) => candidate.value,
    handleUnexpectedTrendDirectionParseFailure,
  )(parseTrendDirection(direction))

const upDirection = unwrapTrendDirection('Up')
const downDirection = unwrapTrendDirection('Down')
const flatDirection = unwrapTrendDirection('Flat')

const resolveThreshold = (signal: Signal, policies: InterpretationPolicies): number =>
  ifElse(
    (candidate: Signal) => candidate.identity.kind === 'Inventory',
    () => policies.flatThresholds.inventory,
    () => policies.flatThresholds.price,
  )(signal)

const resolveDirection = (delta: number, threshold: number): TrendDirection =>
  cond([
    [(candidate: number) => Math.abs(candidate) <= threshold, () => flatDirection],
    [(candidate: number) => candidate > 0, () => upDirection],
    [() => true, () => downDirection],
  ])(delta)

const buildTrendFromDelta = (
  signal: Signal,
  comparisonWindow: InterpretationPolicies['comparisonWindow'],
  threshold: number,
  delta: number,
): Result<Trend, InterpretationError> =>
  ifElse(
    (candidateDelta: number) => Number.isFinite(candidateDelta),
    (candidateDelta) => success(createTrend(comparisonWindow, resolveDirection(candidateDelta, threshold), Math.abs(candidateDelta))),
    () => failure(makeTrendComputationUndefinedError(signal.identity)),
  )(delta)

export const calculateOneWeekTrend = (
  signal: Signal,
  previousObservation: HistoricalObservation,
  policies: InterpretationPolicies,
): Result<Trend, InterpretationError> =>
  ifElse(
    (candidate: InterpretationPolicies) => candidate.comparisonWindow.window === 'OneWeek',
    (candidate) => buildTrendFromDelta(signal, candidate.comparisonWindow, resolveThreshold(signal, candidate), signal.value - previousObservation.value),
    (candidate) => failure(makeInvalidComparisonWindowError(candidate.comparisonWindow)),
  )(policies)
