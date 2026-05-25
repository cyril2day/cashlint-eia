import { bindResult, failure, sequenceResults, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { complement, cond, ifElse } from '@/shared/fp'

import type { GeographyScope } from '@/contexts/measurement/model/geography-scope'
import { formatGeographyScope } from '@/contexts/measurement/model/geography-scope'
import type { ReportWeek } from '@/contexts/measurement/model/report-week'
import { formatReportWeekIso } from '@/contexts/measurement/model/report-week'
import type { SupplyMeasurement } from '@/contexts/measurement/model/supply-measurement'

export type SupplySet = Readonly<{
  readonly reportWeek: ReportWeek
  readonly geography: GeographyScope
  readonly production: SupplyMeasurement
  readonly imports: SupplyMeasurement
  readonly exports: SupplyMeasurement
}>

export type SupplySetError = Readonly<{
  readonly kind: 'MissingRequiredMeasurement' | 'DuplicateMeasurement' | 'ReportWeekMismatch' | 'GeographyMismatch'
  readonly input: string
}>

const makeMissingRequiredMeasurementError = (input: string): SupplySetError => ({
  kind: 'MissingRequiredMeasurement',
  input,
})

const makeDuplicateMeasurementError = (input: string): SupplySetError => ({
  kind: 'DuplicateMeasurement',
  input,
})

const makeReportWeekMismatchError = (input: string): SupplySetError => ({
  kind: 'ReportWeekMismatch',
  input,
})

const makeGeographyMismatchError = (input: string): SupplySetError => ({
  kind: 'GeographyMismatch',
  input,
})

const selectSingleMeasurement = (
  measurements: readonly SupplyMeasurement[],
  measurementKind: SupplyMeasurement['measurementKind']['kind'],
): Result<SupplyMeasurement, SupplySetError> => {
  const matches = measurements.filter(measurement => measurement.measurementKind.kind === measurementKind)

  return ifElse(
    (items: readonly SupplyMeasurement[]) => items.length > 1,
    () => failure(makeDuplicateMeasurementError(measurementKind)),
    (items: readonly SupplyMeasurement[]) =>
      cond<[readonly SupplyMeasurement[]], Result<SupplyMeasurement, SupplySetError>>([
        [values => values.length === 1, values => success(values[0])],
        [() => true, () => failure(makeMissingRequiredMeasurementError(measurementKind))],
      ])(items),
  )(matches)
}

const hasUniformReportWeek = (measurements: readonly SupplyMeasurement[]): boolean => {
  const reportWeeks = measurements.map(measurement => formatReportWeekIso(measurement.fact.reportWeek))

  return reportWeeks.every(reportWeek => reportWeek === reportWeeks[0])
}

const hasMixedReportWeek = complement(hasUniformReportWeek)

const hasUniformGeography = (measurements: readonly SupplyMeasurement[]): boolean => {
  const geographies = measurements.map(measurement => formatGeographyScope(measurement.fact.geography))

  return geographies.every(geography => geography === geographies[0])
}

const hasMixedGeography = complement(hasUniformGeography)

const buildSupplySet = (measurements: readonly SupplyMeasurement[]): Result<SupplySet, SupplySetError> =>
  bindResult(
    sequenceResults(supplyMeasurementResults(measurements)),
    ([production, imports, exports]) =>
      success(
        createSupplySet(
          measurements[0].fact.reportWeek,
          measurements[0].fact.geography,
          production,
          imports,
          exports,
        ),
      ),
  )

const supplyMeasurementResults = (
  measurements: readonly SupplyMeasurement[],
): readonly [
  Result<SupplyMeasurement, SupplySetError>,
  Result<SupplyMeasurement, SupplySetError>,
  Result<SupplyMeasurement, SupplySetError>,
] => [
  selectSingleMeasurement(measurements, 'DomesticProduction'),
  selectSingleMeasurement(measurements, 'Imports'),
  selectSingleMeasurement(measurements, 'Exports'),
]

export const createSupplySet = (
  reportWeek: ReportWeek,
  geography: GeographyScope,
  production: SupplyMeasurement,
  imports: SupplyMeasurement,
  exports: SupplyMeasurement,
): SupplySet => ({
  reportWeek,
  geography,
  production,
  imports,
  exports,
})

export const assembleSupplySet = (
  measurements: readonly SupplyMeasurement[],
): Result<SupplySet, SupplySetError> => {
  return cond<[readonly SupplyMeasurement[]], Result<SupplySet, SupplySetError>>([
    [items => items.length === 0, () => failure(makeMissingRequiredMeasurementError('DomesticProduction'))],
    [hasMixedReportWeek, () => failure(makeReportWeekMismatchError('mixed-report-week'))],
    [hasMixedGeography, () => failure(makeGeographyMismatchError('mixed-geography'))],
    [() => true, buildSupplySet],
  ])(measurements)
}
