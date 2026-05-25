import { allPass, find, ifElse, pipeWith } from '@/shared/fp'
import { isSome, some, unwrap } from '@/shared/maybe'
import { bindResult, failure, mapError, sequenceResults, success } from '@/shared/result'
import { requireFieldThen } from '@/contexts/acl/eia-ingestion-acl/helpers/requireField'
import { binder } from '@/contexts/acl/eia-ingestion-acl/helpers/translatorPipeline'
import type { Result } from '@/shared/result'

import type { PriceBoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
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
  isCoreWeeklyPriceNumericCandidate,
  isCoreWeeklyPricePeriodCandidate,
  isCoreWeeklyPriceSeriesIdentifier,
  isCoreWeeklyPriceUnitCandidate,
  coreWeeklyPriceEndpoint,
} from '@/contexts/acl/eia-ingestion-acl/policies'
import { parseIsoDate } from '@/shared/date'

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
    isCoreWeeklyPriceSeriesIdentifier,
    (validSeriesId: string) => success(validSeriesId),
    (invalidSeriesId: string) =>
      failure(
        makeUnsupportedSeriesError(invalidSeriesId, {
          endpoint: coreWeeklyPriceEndpoint,
          seriesId: invalidSeriesId,
        }),
      ),
  )(seriesId)

const readSeriesId = (row: RawEiaRow): BR<string> => {
  const seriesId = selectSeriesId(row)

  const requireSeries = requireFieldThen<string, Result<string, BoundaryError>>('series', coreWeeklyPriceEndpoint, validateSeriesId)

  return requireSeries(seriesId)
}

const validatePeriodCandidate = (
  periodCandidate: string | number,
  seriesId: string,
): BR<string> =>
  ifElse(
    isCoreWeeklyPricePeriodCandidate,
    (candidate: string) =>
      mapError(parseIsoDate(candidate), () =>
        makeInvalidDateOrPeriodError('period', candidate, {
          endpoint: coreWeeklyPriceEndpoint,
          seriesId,
        }),
      ),
    (invalidCandidate: string) =>
      failure(
        makeInvalidDateOrPeriodError('period', invalidCandidate, {
          endpoint: coreWeeklyPriceEndpoint,
          seriesId,
        }),
      ),
  )(String(periodCandidate))

const readPeriodCandidate = (row: RawEiaRow, seriesId: string): BR<string | number> => {
  const periodCandidate = unwrap(row.period)

  const requirePeriod = requireFieldThen<string | number, Result<string | number, BoundaryError>>('period', coreWeeklyPriceEndpoint, candidate => validatePeriodCandidate(candidate, seriesId))

  return requirePeriod(periodCandidate)
}

const validateValueCandidate = (
  valueCandidate: string | number | null,
  seriesId: string,
): BR<string | number | null> =>
  ifElse(
    isCoreWeeklyPriceNumericCandidate,
    () => success(valueCandidate),
    (invalidCandidate: unknown) =>
      failure(
        makeInvalidNumericValueError('value', String(invalidCandidate), {
          endpoint: coreWeeklyPriceEndpoint,
          seriesId,
        }),
      ),
  )(valueCandidate)

const readValueCandidate = (row: RawEiaRow, seriesId: string): BR<string | number | null> => {
  const valueCandidate = unwrap(row.value)

  const requireValue = requireFieldThen<string | number | null, Result<string | number | null, BoundaryError>>('value', coreWeeklyPriceEndpoint, candidate => validateValueCandidate(candidate, seriesId))

  return requireValue(valueCandidate)
}

const readPriceRows = (dataRows: readonly RawEiaRow[] | undefined): BR<readonly RawEiaRow[]> => {
  const requireData = requireFieldThen<readonly RawEiaRow[], BR<readonly RawEiaRow[]>>('data', coreWeeklyPriceEndpoint, success)

  return requireData(dataRows)
}

const translatePriceRows = (rows: readonly RawEiaRow[]): BR<readonly PriceBoundaryDto[]> =>
  sequenceResults(rows.map(translatePriceRow))

const validateUnitCandidate = (
  unitCandidate: string,
  seriesId: string,
): BR<string> =>
  ifElse(
    isCoreWeeklyPriceUnitCandidate,
    validUnit => success(validUnit),
    invalidUnit =>
      failure(
        makeInvalidUnitError('unit', invalidUnit, {
          endpoint: coreWeeklyPriceEndpoint,
          seriesId,
        }),
      ),
  )(unitCandidate)

const readUnitCandidate = (row: RawEiaRow, seriesId: string): BR<string> => {
  const unitCandidate = unwrap(row.unit)

  const requireUnit = requireFieldThen<string, Result<string, BoundaryError>>('unit', coreWeeklyPriceEndpoint, candidate => validateUnitCandidate(candidate, seriesId))

  return requireUnit(unitCandidate)
}

const hasUnsupportedWeeklyFrequency = allPass([(candidate: RawEiaRow) => isSome(candidate.frequency), (candidate: RawEiaRow) => unwrap(candidate.frequency) !== 'weekly'])

const readWeeklyFrequency = (row: RawEiaRow, seriesId: string): BR<RawEiaRow> =>
  ifElse(
    hasUnsupportedWeeklyFrequency,
    () => failure(makeFrequencyMismatchError({ endpoint: coreWeeklyPriceEndpoint, seriesId })),
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
    source: { endpoint: coreWeeklyPriceEndpoint },
  })

// binder imported below is used with `pipeWith` to compose Result pipelines

const translatePriceRowPipeline = pipeWith(
  <InputValue, FailureValue, OutputValue>(
    step: (value: InputValue) => Result<OutputValue, FailureValue>,
    result: Result<InputValue, FailureValue>,
  ) => binder(step, result),
  [withSeriesId, withWeeklyRow, withPeriodCandidate, withValueCandidate, withUnitCandidate, toPriceBoundaryDto],
)

export const translatePriceRow = (row: RawEiaRow): Result<PriceBoundaryDto, BoundaryError> =>
  translatePriceRowPipeline(row)

export const translatePriceEnvelope = (
  envelope: RawEiaEnvelope,
): BR<readonly PriceBoundaryDto[]> => {
  const dataRows = unwrap(envelope.data)

  return bindResult(readPriceRows(dataRows), translatePriceRows)
}
