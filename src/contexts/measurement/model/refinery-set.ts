import { bindResult, failure, sequenceResults, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { complement, cond, ifElse } from '@/shared/fp'
import { none, some, type Maybe } from '@/shared/maybe'

import type { GeographyScope } from './geography-scope'
import { formatGeographyScope } from './geography-scope'
import type { ReportWeek } from './report-week'
import { formatReportWeekIso } from './report-week'
import type { RefineryMeasurement } from './refinery-measurement'

export type RefinerySet = Readonly<{
  readonly reportWeek: ReportWeek
  readonly geography: GeographyScope
  readonly netInput: RefineryMeasurement
  readonly grossInput: Maybe<RefineryMeasurement>
  readonly operableCapacity: Maybe<RefineryMeasurement>
  readonly utilization: Maybe<RefineryMeasurement>
}>

export type RefinerySetError = Readonly<{
  readonly kind: 'MissingRequiredMeasurement' | 'DuplicateMeasurement' | 'ReportWeekMismatch' | 'GeographyMismatch'
  readonly input: string
}>

const makeMissingRequiredMeasurementError = (input: string): RefinerySetError => ({
  kind: 'MissingRequiredMeasurement',
  input,
})

const makeDuplicateMeasurementError = (input: string): RefinerySetError => ({
  kind: 'DuplicateMeasurement',
  input,
})

const makeReportWeekMismatchError = (input: string): RefinerySetError => ({
  kind: 'ReportWeekMismatch',
  input,
})

const makeGeographyMismatchError = (input: string): RefinerySetError => ({
  kind: 'GeographyMismatch',
  input,
})

const selectSingleMeasurement = (
  measurements: readonly RefineryMeasurement[],
  measurementKind: RefineryMeasurement['measurementKind']['kind'],
): Result<Maybe<RefineryMeasurement>, RefinerySetError> => {
  const matches = measurements.filter(measurement => measurement.measurementKind.kind === measurementKind)

  return ifElse(
    (items: readonly RefineryMeasurement[]) => items.length > 1,
    () => failure(makeDuplicateMeasurementError(measurementKind)),
    (items: readonly RefineryMeasurement[]) =>
      cond<[readonly RefineryMeasurement[]], Result<Maybe<RefineryMeasurement>, RefinerySetError>>([
        [values => values.length === 1, values => success(some(values[0]))],
        [() => true, () => success(none())],
      ])(items),
  )(matches)
}

type SomeRefineryMeasurement = Readonly<{ readonly kind: 'Some'; readonly value: RefineryMeasurement }>

const isSomeRefineryMeasurement = (value: Maybe<RefineryMeasurement>): value is SomeRefineryMeasurement =>
  value.kind === 'Some'

const toRefinerySetResult = (
  measurements: readonly RefineryMeasurement[],
  grossInput: Maybe<RefineryMeasurement>,
  operableCapacity: Maybe<RefineryMeasurement>,
  utilization: Maybe<RefineryMeasurement>,
) =>
  ifElse(
    isSomeRefineryMeasurement,
    (value: SomeRefineryMeasurement) =>
      success(
        createRefinerySet(
          measurements[0].fact.reportWeek,
          measurements[0].fact.geography,
          value.value,
          grossInput,
          operableCapacity,
          utilization,
        ),
      ),
    () => failure(makeMissingRequiredMeasurementError('RefineryNetInput')),
  )

const buildRefinerySet = (measurements: readonly RefineryMeasurement[]): Result<RefinerySet, RefinerySetError> =>
  bindResult(
    sequenceResults(refineryMeasurementResults(measurements)),
    ([netInput, grossInput, operableCapacity, utilization]) =>
      toRefinerySetResult(measurements, grossInput, operableCapacity, utilization)(netInput),
  )

const refineryMeasurementResults = (
  measurements: readonly RefineryMeasurement[],
): readonly [
  Result<Maybe<RefineryMeasurement>, RefinerySetError>,
  Result<Maybe<RefineryMeasurement>, RefinerySetError>,
  Result<Maybe<RefineryMeasurement>, RefinerySetError>,
  Result<Maybe<RefineryMeasurement>, RefinerySetError>,
] => [
  selectSingleMeasurement(measurements, 'RefineryNetInput'),
  selectSingleMeasurement(measurements, 'RefineryGrossInput'),
  selectSingleMeasurement(measurements, 'RefineryOperableCapacity'),
  selectSingleMeasurement(measurements, 'RefineryUtilization'),
]

const hasUniformReportWeek = (measurements: readonly RefineryMeasurement[]): boolean => {
  const reportWeeks = measurements.map(measurement => formatReportWeekIso(measurement.fact.reportWeek))

  return reportWeeks.every(reportWeek => reportWeek === reportWeeks[0])
}

const hasMixedReportWeek = complement(hasUniformReportWeek)

const hasUniformGeography = (measurements: readonly RefineryMeasurement[]): boolean => {
  const geographies = measurements.map(measurement => formatGeographyScope(measurement.fact.geography))

  return geographies.every(geography => geography === geographies[0])
}

const hasMixedGeography = complement(hasUniformGeography)

export const createRefinerySet = (
  reportWeek: ReportWeek,
  geography: GeographyScope,
  netInput: RefineryMeasurement,
  grossInput: Maybe<RefineryMeasurement>,
  operableCapacity: Maybe<RefineryMeasurement>,
  utilization: Maybe<RefineryMeasurement>,
): RefinerySet => ({
  reportWeek,
  geography,
  netInput,
  grossInput,
  operableCapacity,
  utilization,
})

export const assembleRefinerySet = (
  measurements: readonly RefineryMeasurement[],
): Result<RefinerySet, RefinerySetError> => {
  return cond<[readonly RefineryMeasurement[]], Result<RefinerySet, RefinerySetError>>([
    [items => items.length === 0, () => failure(makeMissingRequiredMeasurementError('RefineryNetInput'))],
    [hasMixedReportWeek, () => failure(makeReportWeekMismatchError('mixed-report-week'))],
    [hasMixedGeography, () => failure(makeGeographyMismatchError('mixed-geography'))],
    [() => true, buildRefinerySet],
  ])(measurements)
}
