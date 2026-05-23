import { cond, ifElse } from '@/shared/fp'
import { failure, success, type Result } from '@/shared/result'

import {
  createBaseline,
  createComputedBaselineResult,
  createNotComputedBaselineResult,
  type BaselineResult,
} from '../model/baseline'
import type { HistoricalSeries } from '../model/historical-series'
import type { InterpretationPolicies } from '../policies'
import {
  makeBaselineWindowTooShortError,
  makeInsufficientHistoryError,
  type InterpretationError,
} from '../errors'

const average = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length

const populationDispersion = (values: readonly number[], centralValue: number): number =>
  Math.sqrt(values.reduce((sum, value) => sum + ((value - centralValue) ** 2), 0) / values.length)

const baselineValues = (
  series: HistoricalSeries,
  policies: InterpretationPolicies,
): readonly number[] =>
  series.observations
    .slice(0, policies.baseline.windowObservations)
    .map(observation => observation.value)

const insufficientBaseline = (
  series: HistoricalSeries,
  policies: InterpretationPolicies,
): boolean => baselineValues(series, policies).length < policies.baseline.minimumObservations

const insufficientBaselineResult = (
  series: HistoricalSeries,
  policies: InterpretationPolicies,
): Result<BaselineResult, InterpretationError> =>
  ifElse(
    (value: InterpretationPolicies) => value.baseline.insufficientHistoryBehavior === 'ReturnNotComputed',
    () => success(createNotComputedBaselineResult('InsufficientBaselineHistory')),
    () => failure(makeInsufficientHistoryError(series.identity, policies.baseline.minimumObservations, baselineValues(series, policies).length)),
  )(policies)

const invalidWindow = (policies: InterpretationPolicies): boolean =>
  policies.baseline.windowObservations < policies.baseline.minimumObservations

const computedBaseline = (
  series: HistoricalSeries,
  policies: InterpretationPolicies,
): Result<BaselineResult, InterpretationError> => {
  const values = baselineValues(series, policies)
  const centralValue = average(values)

  return success(createComputedBaselineResult(createBaseline(
    series.identity,
    values.length,
    centralValue,
    populationDispersion(values, centralValue),
    series.unit,
  )))
}

export const calculateBaseline = (
  series: HistoricalSeries,
  policies: InterpretationPolicies,
): Result<BaselineResult, InterpretationError> =>
  cond<[HistoricalSeries], Result<BaselineResult, InterpretationError>>([
    [
      () => invalidWindow(policies),
      value => failure(makeBaselineWindowTooShortError(value.identity, policies.baseline.minimumObservations, policies.baseline.windowObservations)),
    ],
    [
      value => insufficientBaseline(value, policies),
      value => insufficientBaselineResult(value, policies),
    ],
    [
      () => true,
      value => computedBaseline(value, policies),
    ],
  ])(series)
