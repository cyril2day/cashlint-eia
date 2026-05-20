import { allPass, find, ifElse, pipeWith } from '@/shared/fp'
import { isSome, some, unwrap } from '@/shared/maybe'
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

const selectSeriesId = (row: RawEiaRow): string | undefined =>
  find((candidate: string | undefined): candidate is string => candidate !== undefined, [unwrap(row.series_id), unwrap(row.series)])

type BR<T> = Result<T, BoundaryError>



const validateSeriesId = (seriesId: string): BR<string> =>
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

const readSeriesId = (row: RawEiaRow): BR<string> => {
  const seriesId = selectSeriesId(row)

  return ifElse((candidate: string | undefined) => candidate === undefined, () => failure(makeMissingRequiredFieldError('series', { endpoint: walkingSkeletonInventoryEndpoint })), validateSeriesId)(seriesId)
}

const validatePeriodCandidate = (
  periodCandidate: string | number,
  seriesId: string,
): BR<string | number> =>
  ifElse(
    isWalkingSkeletonInventoryPeriodCandidate,
    () => success(periodCandidate),
    (invalidCandidate: string) =>
      failure(
        makeInvalidDateOrPeriodError('period', invalidCandidate, {
          endpoint: walkingSkeletonInventoryEndpoint,
          seriesId,
        }),
      ),
  )(String(periodCandidate))

const readPeriodCandidate = (row: RawEiaRow, seriesId: string): BR<string | number> => {
  const periodCandidate = unwrap(row.period)

  return ifElse((candidate: string | number | undefined) => candidate === undefined, () => failure(makeMissingRequiredFieldError('period', { endpoint: walkingSkeletonInventoryEndpoint, seriesId })), candidate => validatePeriodCandidate(candidate, seriesId))(periodCandidate)
}

const validateValueCandidate = (
  valueCandidate: string | number | null,
  seriesId: string,
): BR<string | number | null> =>
  ifElse(
    isWalkingSkeletonInventoryNumericCandidate,
    () => success(valueCandidate),
    (invalidCandidate: unknown) =>
      failure(
        makeInvalidNumericValueError('value', String(invalidCandidate), {
          endpoint: walkingSkeletonInventoryEndpoint,
          seriesId,
        }),
      ),
  )(valueCandidate)

const readValueCandidate = (row: RawEiaRow, seriesId: string): BR<string | number | null> => {
  const valueCandidate = unwrap(row.value)

  return ifElse((candidate: string | number | null | undefined) => candidate === undefined, () => failure(makeMissingRequiredFieldError('value', { endpoint: walkingSkeletonInventoryEndpoint, seriesId })), candidate => validateValueCandidate(candidate, seriesId))(valueCandidate)
}

const validateUnitCandidate = (unitCandidate: string, seriesId: string): BR<string> =>
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

const readInventoryRows = (dataRows: readonly RawEiaRow[] | undefined): BR<readonly RawEiaRow[]> =>
  ifElse(
    (candidate: readonly RawEiaRow[] | undefined) => candidate === undefined,
    () => failure(makeMissingRequiredFieldError('data', { endpoint: walkingSkeletonInventoryEndpoint })),
    success,
  )(dataRows)

const translateInventoryRows = (
  rows: readonly RawEiaRow[],
): BR<readonly InventoryBoundaryDto[]> => sequenceResults(rows.map(translateInventoryRow))

const readUnitCandidate = (row: RawEiaRow, seriesId: string): BR<string> => {
  const unitCandidate = unwrap(row.unit)

  return ifElse((candidate: string | undefined) => candidate === undefined, () => failure(makeMissingRequiredFieldError('unit', { endpoint: walkingSkeletonInventoryEndpoint, seriesId })), candidate => validateUnitCandidate(candidate, seriesId))(unitCandidate)
}

const hasUnsupportedWeeklyFrequency = allPass([(candidate: RawEiaRow) => isSome(candidate.frequency), (candidate: RawEiaRow) => unwrap(candidate.frequency) !== 'weekly'])

const readWeeklyFrequency = (row: RawEiaRow, seriesId: string): BR<RawEiaRow> =>
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
): BR<readonly InventoryBoundaryDto[]> => {
  const dataRows = unwrap(envelope.data)

  return bindResult(readInventoryRows(dataRows), translateInventoryRows)
}