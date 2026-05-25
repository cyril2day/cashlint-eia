import { allPass, find, ifElse, pipeWith, isNonEmptyString } from '@/shared/fp'
import { isSome, some, unwrap, none } from '@/shared/maybe'
import { bindResult, failure, mapError, sequenceResults, success } from '@/shared/result'
import { requireFieldThen } from '@/contexts/acl/eia-ingestion-acl/helpers/requireField'
import { binder } from '@/contexts/acl/eia-ingestion-acl/helpers/translatorPipeline'
import type { Result } from '@/shared/result'

import type { RefineryBoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import type { RawEiaEnvelope, RawEiaRow } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'
import type { BoundaryError } from '@/contexts/acl/eia-ingestion-acl/errors'
import {
  makeFrequencyMismatchError,
  makeInvalidDateOrPeriodError,
  makeInvalidNumericValueError,
  makeInvalidUnitError,
  makeUnsupportedSeriesError,
} from '@/contexts/acl/eia-ingestion-acl/errors'
import {
  isCoreWeeklyRefineryNumericCandidate,
  isCoreWeeklyRefineryPeriodCandidate,
  isCoreWeeklyRefinerySeriesIdentifier,
  isCoreWeeklyRefineryUnitCandidate,
  mapSeriesIdToRefineryMeasureKind,
  coreWeeklyRefineryEndpoint,
} from '@/contexts/acl/eia-ingestion-acl/policies'
import { parseIsoDate } from '@/shared/date'

type RefineryRowContext = {
  readonly row: RawEiaRow
  readonly seriesId: string
}

type RefineryWeeklyContext = RefineryRowContext & {
  readonly weeklyRow: RawEiaRow
}

type RefineryPeriodContext = RefineryWeeklyContext & {
  readonly periodCandidate: string | number
}

type RefineryValueContext = RefineryPeriodContext & {
  readonly valueCandidate: string | number | null
}

type RefineryUnitContext = RefineryValueContext & {
  readonly unitCandidate: string
}

type RefineryGeoContext = RefineryUnitContext & {
  readonly geographyCandidate: string
}

const selectSeriesId = (row: RawEiaRow): string | undefined =>
  find(
    (candidate: string | undefined): candidate is string => candidate !== undefined,
    [unwrap(row.series_id), unwrap(row.series)],
  )

const selectGeography = (row: RawEiaRow): string | undefined =>
  unwrap(row.geography)

type BR<T> = Result<T, BoundaryError>

const validateSeriesId = (seriesId: string): BR<string> =>
  ifElse(
    isCoreWeeklyRefinerySeriesIdentifier,
    (validSeriesId: string) => success(validSeriesId),
    (invalidSeriesId: string) =>
      failure(
        makeUnsupportedSeriesError(invalidSeriesId, {
          endpoint: coreWeeklyRefineryEndpoint,
          seriesId: invalidSeriesId,
        }),
      ),
  )(seriesId)

const readSeriesId = (row: RawEiaRow): BR<string> => {
  const seriesId = selectSeriesId(row)

  const requireSeries = requireFieldThen<string, Result<string, BoundaryError>>(
    'series',
    coreWeeklyRefineryEndpoint,
    validateSeriesId,
  )

  return requireSeries(seriesId)
}

const validatePeriodCandidate = (periodCandidate: string | number, seriesId: string): BR<string> =>
  ifElse(
    isCoreWeeklyRefineryPeriodCandidate,
    (candidate: string) =>
      mapError(parseIsoDate(candidate), () =>
        makeInvalidDateOrPeriodError('period', candidate, {
          endpoint: coreWeeklyRefineryEndpoint,
          seriesId,
        }),
      ),
    (invalidCandidate: string) =>
      failure(
        makeInvalidDateOrPeriodError('period', invalidCandidate, {
          endpoint: coreWeeklyRefineryEndpoint,
          seriesId,
        }),
      ),
  )(String(periodCandidate))

const readPeriodCandidate = (row: RawEiaRow, seriesId: string): BR<string | number> => {
  const periodCandidate = unwrap(row.period)

  const requirePeriod = requireFieldThen<string | number, Result<string | number, BoundaryError>>(
    'period',
    coreWeeklyRefineryEndpoint,
    candidate => validatePeriodCandidate(candidate, seriesId),
  )

  return requirePeriod(periodCandidate)
}

const validateValueCandidate = (valueCandidate: string | number | null, seriesId: string): BR<string | number | null> =>
  ifElse(
    isCoreWeeklyRefineryNumericCandidate,
    () => success(valueCandidate),
    (invalidCandidate: unknown) =>
      failure(
        makeInvalidNumericValueError('value', String(invalidCandidate), {
          endpoint: coreWeeklyRefineryEndpoint,
          seriesId,
        }),
      ),
  )(valueCandidate)

const readValueCandidate = (row: RawEiaRow, seriesId: string): BR<string | number | null> => {
  const valueCandidate = unwrap(row.value)

  const requireValue = requireFieldThen<string | number | null, Result<string | number | null, BoundaryError>>(
    'value',
    coreWeeklyRefineryEndpoint,
    candidate => validateValueCandidate(candidate, seriesId),
  )

  return requireValue(valueCandidate)
}

const readRefineryRows = (dataRows: readonly RawEiaRow[] | undefined): BR<readonly RawEiaRow[]> => {
  const requireData = requireFieldThen<readonly RawEiaRow[], BR<readonly RawEiaRow[]>>(
    'data',
    coreWeeklyRefineryEndpoint,
    success,
  )

  return requireData(dataRows)
}

const translateRefineryRows = (rows: readonly RawEiaRow[]): BR<readonly RefineryBoundaryDto[]> =>
  sequenceResults(rows.map(translateRefineryRow))

const validateUnitCandidate = (unitCandidate: string, seriesId: string): BR<string> =>
  ifElse(
    isCoreWeeklyRefineryUnitCandidate,
    validUnit => success(validUnit),
    invalidUnit =>
      failure(
        makeInvalidUnitError('unit', invalidUnit, {
          endpoint: coreWeeklyRefineryEndpoint,
          seriesId,
        }),
      ),
  )(unitCandidate)

const readUnitCandidate = (row: RawEiaRow, seriesId: string): BR<string> => {
  const unitCandidate = unwrap(row.unit)

  const requireUnit = requireFieldThen<string, Result<string, BoundaryError>>(
    'unit',
    coreWeeklyRefineryEndpoint,
    candidate => validateUnitCandidate(candidate, seriesId),
  )

  return requireUnit(unitCandidate)
}

const validateGeographyCandidate = (geographyCandidate: string | undefined, seriesId: string): BR<string> =>
  ifElse(
    (candidate: string | undefined): candidate is string => isNonEmptyString(candidate),
    (candidate: string) => success(candidate),
    () =>
      failure(
        makeInvalidDateOrPeriodError('geography', String(geographyCandidate), {
          endpoint: coreWeeklyRefineryEndpoint,
          seriesId,
        }),
      ),
  )(geographyCandidate)

const readGeographyCandidate = (row: RawEiaRow, seriesId: string): BR<string> => {
  const geographyCandidate = selectGeography(row)

  return validateGeographyCandidate(geographyCandidate, seriesId)
}

const hasUnsupportedWeeklyFrequency = allPass([
  (candidate: RawEiaRow) => isSome(candidate.frequency),
  (candidate: RawEiaRow) => unwrap(candidate.frequency) !== 'weekly',
])

const readWeeklyFrequency = (row: RawEiaRow, seriesId: string): BR<RawEiaRow> =>
  ifElse(
    hasUnsupportedWeeklyFrequency,
    () => failure(makeFrequencyMismatchError({ endpoint: coreWeeklyRefineryEndpoint, seriesId })),
    () => success(row),
  )(row)

const withSeriesId = (row: RawEiaRow): Result<RefineryRowContext, BoundaryError> =>
  bindResult(readSeriesId(row), seriesId => success({ row, seriesId }))

const withWeeklyRow = (context: RefineryRowContext): Result<RefineryWeeklyContext, BoundaryError> =>
  bindResult(readWeeklyFrequency(context.row, context.seriesId), weeklyRow => success({ ...context, weeklyRow }))

const withPeriodCandidate = (context: RefineryWeeklyContext): Result<RefineryPeriodContext, BoundaryError> =>
  bindResult(readPeriodCandidate(context.weeklyRow, context.seriesId), periodCandidate =>
    success({ ...context, periodCandidate }),
  )

const withValueCandidate = (context: RefineryPeriodContext): Result<RefineryValueContext, BoundaryError> =>
  bindResult(readValueCandidate(context.weeklyRow, context.seriesId), valueCandidate =>
    success({ ...context, valueCandidate }),
  )

const withUnitCandidate = (context: RefineryValueContext): Result<RefineryUnitContext, BoundaryError> =>
  bindResult(readUnitCandidate(context.weeklyRow, context.seriesId), unitCandidate =>
    success({ ...context, unitCandidate }),
  )

const withGeographyCandidate = (context: RefineryUnitContext): Result<RefineryGeoContext, BoundaryError> =>
  bindResult(readGeographyCandidate(context.weeklyRow, context.seriesId), geographyCandidate =>
    success({ ...context, geographyCandidate }),
  )

const toRefineryBoundaryDto = (context: RefineryGeoContext): Result<RefineryBoundaryDto, BoundaryError> => {
  const measureKindCandidate = mapSeriesIdToRefineryMeasureKind(context.seriesId)

  const measureKindOption = ifElse(
    (m: string | undefined): m is string => m !== undefined,
    (m: string) => some(m),
    () => none(),
  )(measureKindCandidate)

  return success({
    kind: 'Refinery',
    periodCandidate: some(context.periodCandidate),
    seriesId: some(context.seriesId),
    measureKindCandidate: measureKindOption,
    valueCandidate: some(context.valueCandidate),
    unitCandidate: some(context.unitCandidate),
    geographyCandidate: some(context.geographyCandidate),
    source: { endpoint: coreWeeklyRefineryEndpoint },
  })
}

const translateRefineryRowPipeline = pipeWith(
  <InputValue, FailureValue, OutputValue>(
    step: (value: InputValue) => Result<OutputValue, FailureValue>,
    result: Result<InputValue, FailureValue>,
  ) => binder(step, result),
  [withSeriesId, withWeeklyRow, withPeriodCandidate, withValueCandidate, withUnitCandidate, withGeographyCandidate, toRefineryBoundaryDto],
)

export const translateRefineryRow = (row: RawEiaRow): Result<RefineryBoundaryDto, BoundaryError> =>
  translateRefineryRowPipeline(row)

export const translateRefineryEnvelope = (envelope: RawEiaEnvelope): BR<readonly RefineryBoundaryDto[]> => {
  const dataRows = unwrap(envelope.data)

  return bindResult(readRefineryRows(dataRows), translateRefineryRows)
}
