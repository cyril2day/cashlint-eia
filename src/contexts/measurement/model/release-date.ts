import { compareDates, formatDateIsoDate, isDateValue, parseDate, type DateValue } from '@/shared/date'
import { allPass, ifElse } from '@/shared/fp'
import { mapError, mapResult, success } from '@/shared/result'
import type { Result } from '@/shared/result'

const releaseDateBrand = Symbol('ReleaseDate')

export type ReleaseDate = Readonly<{
  readonly date: DateValue
  readonly [releaseDateBrand]: true
}>

export type ReleaseDateParseError = Readonly<{
  readonly kind: 'InvalidReleaseDateInput'
  readonly input: string
}>

const isObjectInput = (input: unknown): input is object => input instanceof Object

const hasReleaseDateBrand = (candidate: object): boolean => Reflect.get(candidate, releaseDateBrand) === true

const hasValidDate = (candidate: object): boolean => isDateValue(Reflect.get(candidate, 'date'))

const createReleaseDate = (date: DateValue): ReleaseDate =>
  ({
    date,
    [releaseDateBrand]: true,
  })

export const isReleaseDate = (input: unknown): input is ReleaseDate =>
  ifElse(
    isObjectInput,
    allPass([hasReleaseDateBrand, hasValidDate]),
    () => false,
  )(input)

export const parseReleaseDate = (input: unknown): Result<ReleaseDate, ReleaseDateParseError> =>
  ifElse(
    isReleaseDate,
    (candidate: ReleaseDate): Result<ReleaseDate, ReleaseDateParseError> => success(candidate),
    (candidate: unknown): Result<ReleaseDate, ReleaseDateParseError> =>
      mapError(
        mapResult(parseDate(candidate), createReleaseDate),
        error => ({
          kind: 'InvalidReleaseDateInput',
          input: error.input,
        }),
      ),
  )(input)

export const compareReleaseDates = (left: ReleaseDate, right: ReleaseDate): number =>
  compareDates(left.date, right.date)

export const formatReleaseDateIso = (releaseDate: ReleaseDate): string =>
  formatDateIsoDate(releaseDate.date)