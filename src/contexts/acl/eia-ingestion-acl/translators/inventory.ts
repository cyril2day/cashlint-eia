import { allPass, ifElse, pipeWith } from '@/shared/fp'
import { some } from '@/shared/maybe'
import type { Maybe } from '@/shared/maybe'
import { bindResult, failure, sequenceResults, success } from '@/shared/result'
import type { Result } from '@/shared/result'

import type { InventoryBoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
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
  isWalkingSkeletonInventoryNumericCandidate,
  isWalkingSkeletonInventoryPeriodCandidate,
  isWalkingSkeletonInventorySeriesId,
  isWalkingSkeletonInventoryUnitCandidate,
  walkingSkeletonInventoryEndpoint,
} from '@/contexts/acl/eia-ingestion-acl/policies'

type InventoryRowContext = {
  readonly row: RawEiaRow
  readonly seriesId: string
}

type InventoryWeeklyContext = InventoryRowContext & {
  readonly weeklyRow: RawEiaRow
}

type InventoryPeriodContext = InventoryWeeklyContext & {
  readonly periodCandidate: string | number
}

type InventoryValueContext = InventoryPeriodContext & {
  readonly valueCandidate: string | number | null
}

type InventoryUnitContext = InventoryValueContext & {
  readonly unitCandidate: string
}

const readMaybeValue = <T>(value: Maybe<T>): T | undefined =>
  ifElse(
    (candidate: Maybe<T>) => candidate.kind === 'Some',
    (candidate: { readonly kind: 'Some'; readonly value: T }) => candidate.value,
    () => undefined,
  )(value)

const selectSeriesId = (row: RawEiaRow): string | undefined => {
  const primarySeriesId = readMaybeValue(row.series_id)
  const fallbackSeriesId = readMaybeValue(row.series)

  return ifElse(
    (candidate: string | undefined) => candidate === undefined,
    () => fallbackSeriesId,
    (candidate: string) => candidate,
  )(primarySeriesId)
}

const validateSeriesId = (seriesId: string): Result<string, BoundaryError> =>
  ifElse(
    isWalkingSkeletonInventorySeriesId,
    (validSeriesId: string) => success(validSeriesId),
    (invalidSeriesId: string) =>
      failure(
        makeUnsupportedSeriesError(invalidSeriesId, {
          endpoint: walkingSkeletonInventoryEndpoint,
          seriesId: invalidSeriesId,
        }),
      ),
  )(seriesId)

const readSeriesId = (row: RawEiaRow): Result<string, BoundaryError> => {
  const seriesId = selectSeriesId(row)

  return ifElse(
    (candidate: string | undefined) => candidate === undefined,
    () => failure(makeMissingRequiredFieldError('series', { endpoint: walkingSkeletonInventoryEndpoint })),
    (candidate: string) => validateSeriesId(candidate),
  )(seriesId)
}

const validatePeriodCandidate = (
  periodCandidate: string | number,
  seriesId: string,
): Result<string | number, BoundaryError> =>
  ifElse(
    (candidate: string) => isWalkingSkeletonInventoryPeriodCandidate(candidate),
    () => success(periodCandidate),
    (invalidCandidate: string) =>
      failure(
        makeInvalidDateOrPeriodError('period', invalidCandidate, {
          endpoint: walkingSkeletonInventoryEndpoint,
          seriesId,
        }),
      ),
  )(String(periodCandidate))

const readPeriodCandidate = (row: RawEiaRow, seriesId: string): Result<string | number, BoundaryError> => {
  const periodCandidate = readMaybeValue(row.period)

  return ifElse(
    (candidate: string | number | undefined) => candidate === undefined,
    () => failure(makeMissingRequiredFieldError('period', { endpoint: walkingSkeletonInventoryEndpoint, seriesId })),
    (candidate: string | number) => validatePeriodCandidate(candidate, seriesId),
  )(periodCandidate)
}

const validateValueCandidate = (
  valueCandidate: string | number | null,
  seriesId: string,
): Result<string | number | null, BoundaryError> =>
  ifElse(
    (candidate: string) => isWalkingSkeletonInventoryNumericCandidate(candidate),
    () => success(valueCandidate),
    (invalidCandidate: string) =>
      failure(
        makeInvalidNumericValueError('value', invalidCandidate, {
          endpoint: walkingSkeletonInventoryEndpoint,
          seriesId,
        }),
      ),
  )(String(valueCandidate))

const readValueCandidate = (row: RawEiaRow, seriesId: string): Result<string | number | null, BoundaryError> => {
  const valueCandidate = readMaybeValue(row.value)

  return ifElse(
    (candidate: string | number | null | undefined) => candidate === undefined,
    () => failure(makeMissingRequiredFieldError('value', { endpoint: walkingSkeletonInventoryEndpoint, seriesId })),
    (candidate: string | number | null) => validateValueCandidate(candidate, seriesId),
  )(valueCandidate)
}

const validateUnitCandidate = (unitCandidate: string, seriesId: string): Result<string, BoundaryError> =>
  ifElse(
    isWalkingSkeletonInventoryUnitCandidate,
    (validUnitCandidate: string) => success(validUnitCandidate),
    (invalidUnitCandidate: string) =>
      failure(
        makeInvalidUnitError('unit', invalidUnitCandidate, {
          endpoint: walkingSkeletonInventoryEndpoint,
          seriesId,
        }),
      ),
  )(unitCandidate)

const readUnitCandidate = (row: RawEiaRow, seriesId: string): Result<string, BoundaryError> => {
  const unitCandidate = readMaybeValue(row.unit)

  return ifElse(
    (candidate: string | undefined) => candidate === undefined,
    () => failure(makeMissingRequiredFieldError('unit', { endpoint: walkingSkeletonInventoryEndpoint, seriesId })),
    (candidate: string) => validateUnitCandidate(candidate, seriesId),
  )(unitCandidate)
}

const hasUnsupportedWeeklyFrequency = allPass([
  (candidate: RawEiaRow) => candidate.frequency.kind === 'Some',
  (candidate: RawEiaRow) => readMaybeValue(candidate.frequency) !== 'weekly',
])

const readWeeklyFrequency = (row: RawEiaRow, seriesId: string): Result<RawEiaRow, BoundaryError> =>
  ifElse(
    hasUnsupportedWeeklyFrequency,
    () => failure(makeFrequencyMismatchError({ endpoint: walkingSkeletonInventoryEndpoint, seriesId })),
    () => success(row),
  )(row)

const withSeriesId = (row: RawEiaRow): Result<InventoryRowContext, BoundaryError> =>
  bindResult(readSeriesId(row), seriesId => success({ row, seriesId }))

const withWeeklyRow = (context: InventoryRowContext): Result<InventoryWeeklyContext, BoundaryError> =>
  bindResult(readWeeklyFrequency(context.row, context.seriesId), weeklyRow => success({ ...context, weeklyRow }))

const withPeriodCandidate = (
  context: InventoryWeeklyContext,
): Result<InventoryPeriodContext, BoundaryError> =>
  bindResult(readPeriodCandidate(context.weeklyRow, context.seriesId), periodCandidate =>
    success({ ...context, periodCandidate }),
  )

const withValueCandidate = (
  context: InventoryPeriodContext,
): Result<InventoryValueContext, BoundaryError> =>
  bindResult(readValueCandidate(context.weeklyRow, context.seriesId), valueCandidate =>
    success({ ...context, valueCandidate }),
  )

const withUnitCandidate = (
  context: InventoryValueContext,
): Result<InventoryUnitContext, BoundaryError> =>
  bindResult(readUnitCandidate(context.weeklyRow, context.seriesId), unitCandidate =>
    success({ ...context, unitCandidate }),
  )

const toInventoryBoundaryDto = (
  context: InventoryUnitContext,
): Result<InventoryBoundaryDto, BoundaryError> =>
  success({
    kind: 'Inventory',
    periodCandidate: some(context.periodCandidate),
    seriesId: some(context.seriesId),
    valueCandidate: some(context.valueCandidate),
    unitCandidate: some(context.unitCandidate),
    source: { endpoint: walkingSkeletonInventoryEndpoint },
  })

const translateInventoryRowPipeline = pipeWith(
  <InputValue, FailureValue, OutputValue>(
    step: (value: InputValue) => Result<OutputValue, FailureValue>,
    result: Result<InputValue, FailureValue>,
  ) => bindResult(result, step),
  [withSeriesId, withWeeklyRow, withPeriodCandidate, withValueCandidate, withUnitCandidate, toInventoryBoundaryDto],
)

export const translateInventoryRow = (row: RawEiaRow): Result<InventoryBoundaryDto, BoundaryError> =>
  translateInventoryRowPipeline(row)

export const translateInventoryEnvelope = (
  envelope: RawEiaEnvelope,
): Result<readonly InventoryBoundaryDto[], BoundaryError> => {
  const dataRows = readMaybeValue(envelope.data)

  return bindResult(
    ifElse(
      (candidate: readonly RawEiaRow[] | undefined) => candidate === undefined,
      () => failure(makeMissingRequiredFieldError('data', { endpoint: walkingSkeletonInventoryEndpoint })),
      (candidate: readonly RawEiaRow[]) => success(candidate),
    )(dataRows),
    rows => sequenceResults(rows.map(translateInventoryRow)),
  )
}