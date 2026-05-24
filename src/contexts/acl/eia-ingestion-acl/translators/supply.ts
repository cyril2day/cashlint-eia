import { allPass, find, ifElse, pipeWith, isNonEmptyString } from '@/shared/fp'
import { isSome, some, unwrap, none } from '@/shared/maybe'
import { bindResult, failure, mapError, sequenceResults, success } from '@/shared/result'
import { requireFieldThen } from '@/contexts/acl/eia-ingestion-acl/helpers/requireField'
import { binder } from '@/contexts/acl/eia-ingestion-acl/helpers/translatorPipeline'
import type { Result } from '@/shared/result'

import type { SupplyBoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
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
  isWalkingSkeletonSupplyNumericCandidate,
  isWalkingSkeletonSupplyPeriodCandidate,
  isWalkingSkeletonSupplySeriesIdentifier,
  isWalkingSkeletonSupplyUnitCandidate,
  mapSeriesIdToSupplyMeasureKind,
  walkingSkeletonSupplyEndpoint,
} from '@/contexts/acl/eia-ingestion-acl/policies'
import { parseIsoDate } from '@/shared/date'

type SupplyRowContext = {
  readonly row: RawEiaRow
  readonly seriesId: string
}

type SupplyWeeklyContext = SupplyRowContext & {
  readonly weeklyRow: RawEiaRow
}

type SupplyPeriodContext = SupplyWeeklyContext & {
  readonly periodCandidate: string | number
}

type SupplyValueContext = SupplyPeriodContext & {
  readonly valueCandidate: string | number | null
}

type SupplyUnitContext = SupplyValueContext & {
  readonly unitCandidate: string
}

type SupplyGeoContext = SupplyUnitContext & {
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
    isWalkingSkeletonSupplySeriesIdentifier,
    (validSeriesId: string) => success(validSeriesId),
    (invalidSeriesId: string) =>
      failure(
        makeUnsupportedSeriesError(invalidSeriesId, {
          endpoint: walkingSkeletonSupplyEndpoint,
          seriesId: invalidSeriesId,
        }),
      ),
  )(seriesId)

const readSeriesId = (row: RawEiaRow): BR<string> => {
  const seriesId = selectSeriesId(row)

  const requireSeries = requireFieldThen<string, Result<string, BoundaryError>>(
    'series',
    walkingSkeletonSupplyEndpoint,
    validateSeriesId,
  )

  return requireSeries(seriesId)
}

const validatePeriodCandidate = (periodCandidate: string | number, seriesId: string): BR<string> =>
  ifElse(
    isWalkingSkeletonSupplyPeriodCandidate,
    (candidate: string) =>
      mapError(parseIsoDate(candidate), () =>
        makeInvalidDateOrPeriodError('period', candidate, {
          endpoint: walkingSkeletonSupplyEndpoint,
          seriesId,
        }),
      ),
    (invalidCandidate: string) =>
      failure(
        makeInvalidDateOrPeriodError('period', invalidCandidate, {
          endpoint: walkingSkeletonSupplyEndpoint,
          seriesId,
        }),
      ),
  )(String(periodCandidate))

const readPeriodCandidate = (row: RawEiaRow, seriesId: string): BR<string | number> => {
  const periodCandidate = unwrap(row.period)

  const requirePeriod = requireFieldThen<string | number, Result<string | number, BoundaryError>>(
    'period',
    walkingSkeletonSupplyEndpoint,
    candidate => validatePeriodCandidate(candidate, seriesId),
  )

  return requirePeriod(periodCandidate)
}

const validateValueCandidate = (valueCandidate: string | number | null, seriesId: string): BR<string | number | null> =>
  ifElse(
    isWalkingSkeletonSupplyNumericCandidate,
    () => success(valueCandidate),
    (invalidCandidate: unknown) =>
      failure(
        makeInvalidNumericValueError('value', String(invalidCandidate), {
          endpoint: walkingSkeletonSupplyEndpoint,
          seriesId,
        }),
      ),
  )(valueCandidate)

const readValueCandidate = (row: RawEiaRow, seriesId: string): BR<string | number | null> => {
  const valueCandidate = unwrap(row.value)

  const requireValue = requireFieldThen<string | number | null, Result<string | number | null, BoundaryError>>(
    'value',
    walkingSkeletonSupplyEndpoint,
    candidate => validateValueCandidate(candidate, seriesId),
  )

  return requireValue(valueCandidate)
}

const readSupplyRows = (dataRows: readonly RawEiaRow[] | undefined): BR<readonly RawEiaRow[]> => {
  const requireData = requireFieldThen<readonly RawEiaRow[], BR<readonly RawEiaRow[]>>(
    'data',
    walkingSkeletonSupplyEndpoint,
    success,
  )

  return requireData(dataRows)
}

const translateSupplyRows = (rows: readonly RawEiaRow[]): BR<readonly SupplyBoundaryDto[]> =>
  sequenceResults(rows.map(translateSupplyRow))

const validateUnitCandidate = (unitCandidate: string, seriesId: string): BR<string> =>
  ifElse(
    isWalkingSkeletonSupplyUnitCandidate,
    validUnit => success(validUnit),
    invalidUnit =>
      failure(
        makeInvalidUnitError('unit', invalidUnit, {
          endpoint: walkingSkeletonSupplyEndpoint,
          seriesId,
        }),
      ),
  )(unitCandidate)

const readUnitCandidate = (row: RawEiaRow, seriesId: string): BR<string> => {
  const unitCandidate = unwrap(row.unit)

  const requireUnit = requireFieldThen<string, Result<string, BoundaryError>>(
    'unit',
    walkingSkeletonSupplyEndpoint,
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
          endpoint: walkingSkeletonSupplyEndpoint,
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
    () => failure(makeFrequencyMismatchError({ endpoint: walkingSkeletonSupplyEndpoint, seriesId })),
    () => success(row),
  )(row)

const withSeriesId = (row: RawEiaRow): Result<SupplyRowContext, BoundaryError> =>
  bindResult(readSeriesId(row), seriesId => success({ row, seriesId }))

const withWeeklyRow = (context: SupplyRowContext): Result<SupplyWeeklyContext, BoundaryError> =>
  bindResult(readWeeklyFrequency(context.row, context.seriesId), weeklyRow => success({ ...context, weeklyRow }))

const withPeriodCandidate = (context: SupplyWeeklyContext): Result<SupplyPeriodContext, BoundaryError> =>
  bindResult(readPeriodCandidate(context.weeklyRow, context.seriesId), periodCandidate =>
    success({ ...context, periodCandidate }),
  )

const withValueCandidate = (context: SupplyPeriodContext): Result<SupplyValueContext, BoundaryError> =>
  bindResult(readValueCandidate(context.weeklyRow, context.seriesId), valueCandidate =>
    success({ ...context, valueCandidate }),
  )

const withUnitCandidate = (context: SupplyValueContext): Result<SupplyUnitContext, BoundaryError> =>
  bindResult(readUnitCandidate(context.weeklyRow, context.seriesId), unitCandidate =>
    success({ ...context, unitCandidate }),
  )

const withGeographyCandidate = (context: SupplyUnitContext): Result<SupplyGeoContext, BoundaryError> =>
  bindResult(readGeographyCandidate(context.weeklyRow, context.seriesId), geographyCandidate =>
    success({ ...context, geographyCandidate }),
  )

const toSupplyBoundaryDto = (context: SupplyGeoContext): Result<SupplyBoundaryDto, BoundaryError> => {
  const measureKindCandidate = mapSeriesIdToSupplyMeasureKind(context.seriesId)

  const measureKindOption = ifElse(
    (m: string | undefined): m is string => m !== undefined,
    (m: string) => some(m),
    () => none(),
  )(measureKindCandidate)

  return success({
    kind: 'Supply',
    periodCandidate: some(context.periodCandidate),
    seriesId: some(context.seriesId),
    measureKindCandidate: measureKindOption,
    valueCandidate: some(context.valueCandidate),
    unitCandidate: some(context.unitCandidate),
    geographyCandidate: some(context.geographyCandidate),
    source: { endpoint: walkingSkeletonSupplyEndpoint },
  })
}

const translateSupplyRowPipeline = pipeWith(
  <InputValue, FailureValue, OutputValue>(
    step: (value: InputValue) => Result<OutputValue, FailureValue>,
    result: Result<InputValue, FailureValue>,
  ) => binder(step, result),
  [withSeriesId, withWeeklyRow, withPeriodCandidate, withValueCandidate, withUnitCandidate, withGeographyCandidate, toSupplyBoundaryDto],
)

export const translateSupplyRow = (row: RawEiaRow): Result<SupplyBoundaryDto, BoundaryError> =>
  translateSupplyRowPipeline(row)

export const translateSupplyEnvelope = (envelope: RawEiaEnvelope): BR<readonly SupplyBoundaryDto[]> => {
  const dataRows = unwrap(envelope.data)

  return bindResult(readSupplyRows(dataRows), translateSupplyRows)
}
