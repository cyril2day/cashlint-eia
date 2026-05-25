import { parseTrendDirection, type TrendDirection } from '@/contexts/measurement/model/trend-direction'
import { ifElse, cond } from '@/shared/fp'
import { failure, success, bindResult, mapError, type Result } from '@/shared/result'

import type { HistoricalObservation } from '../model/historical-observation'
import type { HistoricalSeries } from '../model/historical-series'
import type { Signal } from '../model/signal'
import { createTrend, type Trend } from '../model/trend'
import type { InterpretationPolicies } from '../policies'
import {
  makeInvalidComparisonWindowError,
  makeMissingPreviousObservationError,
  makeTrendComputationUndefinedError,
  makeUnsupportedComparisonWindowError,
  type InterpretationError,
} from '../errors'
import { matchPreviousObservation } from './match-previous-observation'

const windowWeeks = (window: InterpretationPolicies['comparisonWindow']): Result<number, InterpretationError> =>
  cond<[InterpretationPolicies['comparisonWindow']], Result<number, InterpretationError>>([
    [value => value.window === 'OneWeek', () => success(1)],
    [value => value.window === 'TwoWeek', () => success(2)],
    [value => value.window === 'FourWeek', () => success(4)],
    [() => true, value => failure(makeInvalidComparisonWindowError(value.window))],
  ])(window)

const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000

const weeksBetween = (signal: Signal, observation: HistoricalObservation): number =>
  Math.round((signal.reportWeek.date.getTime() - observation.reportWeek.date.getTime()) / millisecondsPerWeek)

const comparisonObservation = (
  signal: Signal,
  series: HistoricalSeries,
  weeks: number,
): HistoricalObservation | undefined =>
  series.observations.find(observation => weeksBetween(signal, observation) === weeks)

const thresholdForSignal = (signal: Signal, policies: InterpretationPolicies): number =>
  cond<[Signal], number>([
    [value => value.identity.kind === 'Inventory', () => policies.flatThresholds.inventory],
    [value => value.identity.kind === 'Price', () => policies.flatThresholds.price],
    [() => true, () => policies.flatThresholds.inventory],
  ])(signal)

const trendDirectionFromLabel = (
  signal: Signal,
  label: TrendDirection['direction'],
): Result<TrendDirection, InterpretationError> =>
  mapError(
    parseTrendDirection(label),
    () => makeTrendComputationUndefinedError(signal.identity),
  )

const resolveDirection = (signal: Signal, delta: number, threshold: number): Result<TrendDirection, InterpretationError> =>
  cond<[number], Result<TrendDirection, InterpretationError>>([
    [value => Math.abs(value) <= threshold, () => trendDirectionFromLabel(signal, 'Flat')],
    [value => value > 0, () => trendDirectionFromLabel(signal, 'Up')],
    [() => true, () => trendDirectionFromLabel(signal, 'Down')],
  ])(delta)

const unsupportedWindow = (
  policies: InterpretationPolicies,
): Result<InterpretationPolicies, InterpretationError> =>
  ifElse(
    (value: InterpretationPolicies) => value.supportedComparisonWindows.some(window => window === value.comparisonWindow.window),
    success,
    value => failure(makeUnsupportedComparisonWindowError(value.comparisonWindow.window)),
  )(policies)

const trendFromObservation = (
  signal: Signal,
  observation: HistoricalObservation,
  policies: InterpretationPolicies,
): Result<Trend, InterpretationError> => {
  const delta = signal.value - observation.value

  return ifElse(
    Number.isFinite,
    (value: number) =>
      bindResult(
        resolveDirection(signal, value, thresholdForSignal(signal, policies)),
        direction => success(createTrend(policies.comparisonWindow, direction, Math.abs(value))),
      ),
    () => failure(makeTrendComputationUndefinedError(signal.identity)),
  )(delta)
}

const calculateTrendForWeeks = (
  signal: Signal,
  series: HistoricalSeries,
  policies: InterpretationPolicies,
  weeks: number,
): Result<Trend, InterpretationError> =>
  ifElse(
    (observation: HistoricalObservation | undefined): observation is HistoricalObservation => observation !== undefined,
    observation => bindResult(matchPreviousObservation(signal, observation), matched => trendFromObservation(signal, matched, policies)),
    () => failure(makeMissingPreviousObservationError(signal.identity)),
  )(comparisonObservation(signal, series, weeks))

const calculateSupportedTrend = (
  signal: Signal,
  series: HistoricalSeries,
  policies: InterpretationPolicies,
) => (): Result<Trend, InterpretationError> =>
  bindResult(
    windowWeeks(policies.comparisonWindow),
    weeks => calculateTrendForWeeks(signal, series, policies, weeks),
  )

export const calculateTrend = (
  signal: Signal,
  series: HistoricalSeries,
  policies: InterpretationPolicies,
): Result<Trend, InterpretationError> =>
  bindResult(unsupportedWindow(policies), calculateSupportedTrend(signal, series, policies))
