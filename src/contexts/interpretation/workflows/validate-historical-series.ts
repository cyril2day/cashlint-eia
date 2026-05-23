import { formatMeasurementUnit } from '@/contexts/measurement/model/measurement-unit'
import { compareReportWeeks, formatReportWeekIso } from '@/contexts/measurement/model/report-week'
import { cond, ifElse } from '@/shared/fp'
import { failure, success, type Result } from '@/shared/result'

import type { HistoricalSeries } from '../model/historical-series'
import { formatSignalIdentity } from '../model/signal-identity'
import type { InterpretationPolicies } from '../policies'
import {
  makeDuplicateObservationError,
  makeHistoricalSeriesInvalidError,
  makeIncompatibleUnitsError,
  makeInsufficientHistoryError,
  makeSignalIdentityMismatchError,
  type InterpretationError,
} from '../errors'

const identityMismatchExists = (series: HistoricalSeries): boolean =>
  series.observations.some(
    observation => formatSignalIdentity(observation.identity) !== formatSignalIdentity(series.identity),
  )

const firstIdentityMismatch = (series: HistoricalSeries) =>
  series.observations.find(
    observation => formatSignalIdentity(observation.identity) !== formatSignalIdentity(series.identity),
  )

const unitMismatchExists = (series: HistoricalSeries): boolean =>
  series.observations.some(
    observation => formatMeasurementUnit(observation.unit) !== formatMeasurementUnit(series.unit),
  )

const firstUnitMismatch = (series: HistoricalSeries) =>
  series.observations.find(
    observation => formatMeasurementUnit(observation.unit) !== formatMeasurementUnit(series.unit),
  )

const mismatchedIdentity = (series: HistoricalSeries) =>
  ifElse(
    (observation: ReturnType<typeof firstIdentityMismatch>): observation is NonNullable<ReturnType<typeof firstIdentityMismatch>> => observation !== undefined,
    observation => observation.identity,
    () => series.identity,
  )(firstIdentityMismatch(series))

const mismatchedUnit = (series: HistoricalSeries) =>
  ifElse(
    (observation: ReturnType<typeof firstUnitMismatch>): observation is NonNullable<ReturnType<typeof firstUnitMismatch>> => observation !== undefined,
    observation => observation.unit,
    () => series.unit,
  )(firstUnitMismatch(series))

const duplicateWeekExists = (series: HistoricalSeries): boolean => {
  const keys = series.observations.map(observation => formatReportWeekIso(observation.reportWeek))

  return keys.some((key, index) => keys.indexOf(key) !== index)
}

const invalidOrderingExists = (series: HistoricalSeries): boolean =>
  series.observations.some((observation, index) =>
    ifElse(
      (candidateIndex: number) => candidateIndex === 0,
      () => false,
      candidateIndex => compareReportWeeks(series.observations[candidateIndex - 1].reportWeek, observation.reportWeek) < 0,
    )(index),
  )

const invalidValueExists = (series: HistoricalSeries): boolean =>
  series.observations.some(observation => Number.isFinite(observation.value) === false)

const insufficientHistoryExists = (
  series: HistoricalSeries,
  policies: InterpretationPolicies,
): boolean => series.observations.length < policies.historicalCoverage.minimumTrendObservations

const duplicateWeekInput = (series: HistoricalSeries): string =>
  series.observations.map(observation => formatReportWeekIso(observation.reportWeek)).join(',')

export const validateHistoricalSeries = (
  series: HistoricalSeries,
  policies: InterpretationPolicies,
): Result<HistoricalSeries, InterpretationError> =>
  cond<[HistoricalSeries], Result<HistoricalSeries, InterpretationError>>([
    [
      value => value.observations.length === 0,
      value => failure(makeInsufficientHistoryError(value.identity, policies.historicalCoverage.minimumTrendObservations, 0)),
    ],
    [
      identityMismatchExists,
      value => failure(makeSignalIdentityMismatchError(value.identity, mismatchedIdentity(value))),
    ],
    [
      unitMismatchExists,
      value => failure(makeIncompatibleUnitsError(value.identity, formatMeasurementUnit(value.unit), formatMeasurementUnit(mismatchedUnit(value)))),
    ],
    [
      duplicateWeekExists,
      value => failure(makeDuplicateObservationError(value.identity, duplicateWeekInput(value))),
    ],
    [
      invalidOrderingExists,
      value => failure(makeHistoricalSeriesInvalidError(value.identity, 'invalid-ordering')),
    ],
    [
      invalidValueExists,
      value => failure(makeHistoricalSeriesInvalidError(value.identity, 'invalid-value')),
    ],
    [
      value => insufficientHistoryExists(value, policies),
      value => failure(makeInsufficientHistoryError(value.identity, policies.historicalCoverage.minimumTrendObservations, value.observations.length)),
    ],
    [() => true, success],
  ])(series)
