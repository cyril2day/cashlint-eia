import { allPass, find, ifElse, pipeWith } from '@/shared/fp'
import { isSome, some, unwrap } from '@/shared/maybe'
import { bindResult, failure, sequenceResults, success } from '@/shared/result'
import type { Result } from '@/shared/result'

import type { PriceBoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import type { RawEiaEnvelope, RawEiaRow } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'
import type { BoundaryError } from '@/contexts/acl/eia-ingestion-acl/errors'
import {
  makeFrequencyMismatchError,
  makeInvalidDateOrPeriodError,
  makeInvalidNumericValueError,
  makeInvalidUnitError,
  makeMissingRequiredFieldError,
  makeUnsupportedSeriesError,
} from '@/contexts/acl/eia-ingestion-acl/errors'
import {
  isWalkingSkeletonPriceNumericCandidate,
  isWalkingSkeletonPricePeriodCandidate,
  isWalkingSkeletonPriceSeriesIdentifier,
  isWalkingSkeletonPriceUnitCandidate,
  walkingSkeletonPriceEndpoint,
} from '@/contexts/acl/eia-ingestion-acl/policies'

type PriceRowContext = {
  readonly row: RawEiaRow
  readonly seriesId: string
}

type PriceWeeklyContext = PriceRowContext & {
  readonly weeklyRow: RawEiaRow
}

type PricePeriodContext = PriceWeeklyContext & {
  readonly periodCandidate: string | number
}

type PriceValueContext = PricePeriodContext & {
  readonly valueCandidate: string | number | null
}

type PriceUnitContext = PriceValueContext & {
  readonly unitCandidate: string
}
const priceMeasureKindCandidate = 'WTISpotPrice'

const selectSeriesId = (row: RawEiaRow): string | undefined =>
  find(
    (candidate: string | undefined): candidate is string => candidate !== undefined,
    [unwrap(row.series_id), unwrap(row.series), unwrap(row.product)],
  )

type BR<T> = Result<T, BoundaryError>

const validateSeriesId = (seriesId: string): BR<string> =>
  ifElse(
    isWalkingSkeletonPriceSeriesIdentifier,
    (validSeriesId: string) => success(validSeriesId),
    (invalidSeriesId: string) =>
      failure(
        makeUnsupportedSeriesError(invalidSeriesId, {
          endpoint: walkingSkeletonPriceEndpoint,
          seriesId: invalidSeriesId,
        }),
      ),
  )(seriesId)

const readSeriesId = (row: RawEiaRow): BR<string> => {
  const seriesId = selectSeriesId(row)

  return ifElse((candidate: string | undefined) => candidate === undefined, () => failure(makeMissingRequiredFieldError('series', { endpoint: walkingSkeletonPriceEndpoint })), validateSeriesId)(seriesId)
}

const validatePeriodCandidate = (
  periodCandidate: string | number,
  seriesId: string,
): BR<string | number> =>
  ifElse(
    isWalkingSkeletonPricePeriodCandidate,
    () => success(periodCandidate),
    (invalidCandidate: string) =>
      failure(
        makeInvalidDateOrPeriodError('period', invalidCandidate, {
          endpoint: walkingSkeletonPriceEndpoint,
          seriesId,
        }),
      ),
  )(String(periodCandidate))

const readPeriodCandidate = (row: RawEiaRow, seriesId: string): BR<string | number> => {
  const periodCandidate = unwrap(row.period)

  return ifElse((candidate: string | number | undefined) => candidate === undefined, () => failure(makeMissingRequiredFieldError('period', { endpoint: walkingSkeletonPriceEndpoint, seriesId })), candidate => validatePeriodCandidate(candidate, seriesId))(periodCandidate)
}

const validateValueCandidate = (
  valueCandidate: string | number | null,
  seriesId: string,
): BR<string | number | null> =>
  ifElse(
    isWalkingSkeletonPriceNumericCandidate,
    () => success(valueCandidate),
    (invalidCandidate: string) =>
      failure(
        makeInvalidNumericValueError('value', invalidCandidate, {
          endpoint: walkingSkeletonPriceEndpoint,
          seriesId,
        }),
      ),
  )(String(valueCandidate))

const readValueCandidate = (row: RawEiaRow, seriesId: string): BR<string | number | null> => {
  const valueCandidate = unwrap(row.value)

  return ifElse((candidate: string | number | null | undefined) => candidate === undefined, () => failure(makeMissingRequiredFieldError('value', { endpoint: walkingSkeletonPriceEndpoint, seriesId })), candidate => validateValueCandidate(candidate, seriesId))(valueCandidate)
}

const validateUnitCandidate = (unitCandidate: string, seriesId: string): BR<string> =>
  ifElse(
    isWalkingSkeletonPriceUnitCandidate,
    (validUnitCandidate: string) => success(validUnitCandidate),
    (invalidUnitCandidate: string) =>
      failure(
        makeInvalidUnitError('unit', invalidUnitCandidate, {
          endpoint: walkingSkeletonPriceEndpoint,
          seriesId,
        }),
      ),
  )(unitCandidate)

const readUnitCandidate = (row: RawEiaRow, seriesId: string): BR<string> => {
  const unitCandidate = unwrap(row.unit)

  return ifElse((candidate: string | undefined) => candidate === undefined, () => failure(makeMissingRequiredFieldError('unit', { endpoint: walkingSkeletonPriceEndpoint, seriesId })), candidate => validateUnitCandidate(candidate, seriesId))(unitCandidate)
}

const hasUnsupportedWeeklyFrequency = allPass([(candidate: RawEiaRow) => isSome(candidate.frequency), (candidate: RawEiaRow) => unwrap(candidate.frequency) !== 'weekly'])

const readWeeklyFrequency = (row: RawEiaRow, seriesId: string): BR<RawEiaRow> =>
  ifElse(
    hasUnsupportedWeeklyFrequency,
    () => failure(makeFrequencyMismatchError({ endpoint: walkingSkeletonPriceEndpoint, seriesId })),
    () => success(row),
  )(row)

const withSeriesId = (row: RawEiaRow): Result<PriceRowContext, BoundaryError> =>
  bindResult(readSeriesId(row), seriesId => success({ row, seriesId }))

const withWeeklyRow = (context: PriceRowContext): Result<PriceWeeklyContext, BoundaryError> =>
  bindResult(readWeeklyFrequency(context.row, context.seriesId), weeklyRow => success({ ...context, weeklyRow }))

const withPeriodCandidate = (context: PriceWeeklyContext): Result<PricePeriodContext, BoundaryError> =>
  bindResult(readPeriodCandidate(context.weeklyRow, context.seriesId), periodCandidate =>
    success({ ...context, periodCandidate }),
  )

const withValueCandidate = (context: PricePeriodContext): Result<PriceValueContext, BoundaryError> =>
  bindResult(readValueCandidate(context.weeklyRow, context.seriesId), valueCandidate =>
    success({ ...context, valueCandidate }),
  )

const withUnitCandidate = (context: PriceValueContext): Result<PriceUnitContext, BoundaryError> =>
  bindResult(readUnitCandidate(context.weeklyRow, context.seriesId), unitCandidate =>
    success({ ...context, unitCandidate }),
  )

const toPriceBoundaryDto = (context: PriceUnitContext): Result<PriceBoundaryDto, BoundaryError> =>
  success({
    kind: 'Price',
    periodCandidate: some(context.periodCandidate),
    seriesId: some(context.seriesId),
    measureKindCandidate: some(priceMeasureKindCandidate),
    valueCandidate: some(context.valueCandidate),
    unitCandidate: some(context.unitCandidate),
    source: { endpoint: walkingSkeletonPriceEndpoint },
  })

const translatePriceRowPipeline = pipeWith(
  <InputValue, FailureValue, OutputValue>(
    step: (value: InputValue) => Result<OutputValue, FailureValue>,
    result: Result<InputValue, FailureValue>,
  ) => bindResult(result, step),
  [withSeriesId, withWeeklyRow, withPeriodCandidate, withValueCandidate, withUnitCandidate, toPriceBoundaryDto],
)

export const translatePriceRow = (row: RawEiaRow): Result<PriceBoundaryDto, BoundaryError> =>
  translatePriceRowPipeline(row)

export const translatePriceEnvelope = (
  envelope: RawEiaEnvelope,
): BR<readonly PriceBoundaryDto[]> => {
  const dataRows = unwrap(envelope.data)

  return bindResult(ifElse((candidate: readonly RawEiaRow[] | undefined) => candidate === undefined, () => failure(makeMissingRequiredFieldError('data', { endpoint: walkingSkeletonPriceEndpoint })), success)(dataRows), rows => sequenceResults(rows.map(translatePriceRow)))
}