import { bindResult, failure, mapError, success, type Result } from '@/shared/result'
import { cond, ifElse } from '@/shared/fp'
import type { TrendDirection, TrendDirectionLabel } from '@/contexts/measurement/model/trend-direction'
import { parseTrendDirection } from '@/contexts/measurement/model/trend-direction'
import type { HistoricalObservation } from '../model/historical-observation'
import { createTrend, type Trend } from '../model/trend'
import type { Signal } from '../model/signal'
import { type InterpretationPolicies } from '../policies'
import { makeInvalidComparisonWindowError, makeTrendComputationUndefinedError, type InterpretationError } from '../errors'

const isOneWeekWindow = (policies: InterpretationPolicies): boolean => policies.comparisonWindow.window === 'OneWeek'
const isFiniteNumber = (candidate: number): boolean => Number.isFinite(candidate)

const resolveThreshold = (signal: Signal, policies: InterpretationPolicies): number =>
  ifElse(
    (candidate: Signal) => candidate.identity.kind === 'Inventory',
    () => policies.flatThresholds.inventory,
    () => policies.flatThresholds.price,
  )(signal)

const trendDirectionFromLabel = (
  signal: Signal,
  label: TrendDirectionLabel,
): Result<TrendDirection, InterpretationError> =>
  mapError(
    parseTrendDirection(label),
    () => makeTrendComputationUndefinedError(signal.identity),
  )

const resolveDirection = (signal: Signal, delta: number, threshold: number): Result<TrendDirection, InterpretationError> =>
  cond<[number], Result<TrendDirection, InterpretationError>>([
    [(candidate: number) => Math.abs(candidate) <= threshold, () => trendDirectionFromLabel(signal, 'Flat')],
    [(candidate: number) => candidate > 0, () => trendDirectionFromLabel(signal, 'Up')],
    [() => true, () => trendDirectionFromLabel(signal, 'Down')],
  ])(delta)

const createTrendFromDirection = (
  comparisonWindow: InterpretationPolicies['comparisonWindow'],
  delta: number,
) =>
  (direction: TrendDirection): Result<Trend, InterpretationError> =>
    success(createTrend(comparisonWindow, direction, Math.abs(delta)))

const buildTrendFromDelta = (
  signal: Signal,
  comparisonWindow: InterpretationPolicies['comparisonWindow'],
  threshold: number,
  delta: number,
): Result<Trend, InterpretationError> =>
  ifElse(
    isFiniteNumber,
    candidateDelta => bindResult(resolveDirection(signal, candidateDelta, threshold), createTrendFromDirection(comparisonWindow, candidateDelta)),
    () => failure(makeTrendComputationUndefinedError(signal.identity)),
  )(delta)

export const calculateOneWeekTrend = (
  signal: Signal,
  previousObservation: HistoricalObservation,
  policies: InterpretationPolicies,
): Result<Trend, InterpretationError> =>
  ifElse(
    isOneWeekWindow,
    (candidate) => buildTrendFromDelta(signal, candidate.comparisonWindow, resolveThreshold(signal, candidate), signal.value - previousObservation.value),
    (candidate) => failure(makeInvalidComparisonWindowError(candidate.comparisonWindow)),
  )(policies)
