import { ifElse } from '@/shared/fp'
import { none, some } from '@/shared/maybe'
import type { Maybe } from '@/shared/maybe'

export type BoundaryErrorKind =
  | 'MissingRequiredField'
  | 'InvalidDateOrPeriod'
  | 'InvalidNumericValue'
  | 'InvalidUnit'
  | 'FrequencyMismatch'
  | 'UnsupportedSeries'
  | 'IncompleteWeeklyInput'
  | 'UpstreamUnavailable'
  | 'UpstreamRateLimit'

export type BoundaryError = Readonly<{
  readonly kind: BoundaryErrorKind
  readonly endpoint: Maybe<string>
  readonly endpointFamily: Maybe<string>
  readonly seriesId: Maybe<string>
  readonly fieldName: Maybe<string>
  readonly rawValue: Maybe<string>
  readonly message: string
}>

export type BoundaryErrorInput = Partial<
  Readonly<{
    readonly endpoint: string
    readonly endpointFamily: string
    readonly seriesId: string
    readonly fieldName: string
    readonly rawValue: string
  }>
>

const toMaybeString = (value: string | undefined): Maybe<string> =>
  ifElse(
    (candidate: string | undefined) => candidate === undefined,
    () => none(),
    (candidate: string) => some(candidate),
  )(value)

export const makeBoundaryError = (
  kind: BoundaryErrorKind,
  message: string,
  details: BoundaryErrorInput = {},
): BoundaryError => ({
  kind,
  endpoint: toMaybeString(details.endpoint),
  endpointFamily: toMaybeString(details.endpointFamily),
  seriesId: toMaybeString(details.seriesId),
  fieldName: toMaybeString(details.fieldName),
  rawValue: toMaybeString(details.rawValue),
  message,
})

export const makeMissingRequiredFieldError = (
  fieldName: string,
  details: BoundaryErrorInput = {},
): BoundaryError =>
  makeBoundaryError('MissingRequiredField', `missing required field: ${fieldName}`, {
    ...details,
    fieldName,
  })

export const makeInvalidDateOrPeriodError = (
  fieldName: string,
  rawValue: string | undefined,
  details: BoundaryErrorInput = {},
): BoundaryError =>
  makeBoundaryError('InvalidDateOrPeriod', `invalid date or period in field: ${fieldName}`, {
    ...details,
    fieldName,
    rawValue,
  })

export const makeInvalidNumericValueError = (
  fieldName: string,
  rawValue: string | undefined,
  details: BoundaryErrorInput = {},
): BoundaryError =>
  makeBoundaryError('InvalidNumericValue', `invalid numeric value in field: ${fieldName}`, {
    ...details,
    fieldName,
    rawValue,
  })

export const makeInvalidUnitError = (
  fieldName: string,
  rawValue: string | undefined,
  details: BoundaryErrorInput = {},
): BoundaryError =>
  makeBoundaryError('InvalidUnit', `invalid unit in field: ${fieldName}`, {
    ...details,
    fieldName,
    rawValue,
  })

export const makeFrequencyMismatchError = (
  details: BoundaryErrorInput = {},
): BoundaryError =>
  makeBoundaryError('FrequencyMismatch', 'frequency does not match walking-skeleton policy', details)

export const makeUnsupportedSeriesError = (
  rawValue: string | undefined,
  details: BoundaryErrorInput = {},
): BoundaryError =>
  makeBoundaryError('UnsupportedSeries', 'unsupported EIA series identifier', {
    ...details,
    rawValue,
  })

export const makeIncompleteWeeklyInputError = (
  details: BoundaryErrorInput = {},
): BoundaryError =>
  makeBoundaryError('IncompleteWeeklyInput', 'weekly boundary input is incomplete', details)

export const makeUpstreamUnavailableError = (
  details: BoundaryErrorInput = {},
): BoundaryError => makeBoundaryError('UpstreamUnavailable', 'upstream EIA service is unavailable', details)

export const makeUpstreamRateLimitError = (
  details: BoundaryErrorInput = {},
): BoundaryError => makeBoundaryError('UpstreamRateLimit', 'upstream EIA service rate limit reached', details)