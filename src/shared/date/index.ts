import { compareAsc, formatISO, isValid, parseISO } from 'date-fns'
import { ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'

// Shared Date primitives (parseDate, format helpers, comparisons)
export type DateValue = Date

export type DateParseError = {
  readonly kind: 'InvalidDateInput'
  readonly input: string
}

const describeDateInput = (input: unknown): string => String(input)

const isDateInput = (input: unknown): input is Date => input instanceof Date

const isStringInput = (input: unknown): input is string => typeof input === 'string'

const cloneDate = (date: Date): Date => parseISO(formatISO(date))

const toValidDateResult = (
  candidate: Date,
  originalInput: unknown,
): Result<DateValue, DateParseError> =>
  ifElse(
    (value: Date) => isValid(value),
    (value: Date): Result<DateValue, DateParseError> => success(cloneDate(value)),
    (): Result<DateValue, DateParseError> =>
      failure({
        kind: 'InvalidDateInput',
        input: describeDateInput(originalInput),
      }),
  )(candidate)

const parseDateFromString = (candidate: string): Result<DateValue, DateParseError> =>
  toValidDateResult(parseISO(candidate), candidate)

const parseDateFromDate = (candidate: Date): Result<DateValue, DateParseError> =>
  toValidDateResult(candidate, candidate)

const parseInvalidDateInput = (candidate: unknown): Result<DateValue, DateParseError> =>
  failure({
    kind: 'InvalidDateInput',
    input: describeDateInput(candidate),
  })

const parseDateFromCandidate = (candidate: unknown): Result<DateValue, DateParseError> =>
  ifElse(isStringInput, parseDateFromString, parseInvalidDateInput)(candidate)

export const parseDate = (input: unknown): Result<DateValue, DateParseError> =>
  ifElse(isDateInput, parseDateFromDate, parseDateFromCandidate)(input)

export const isDateValue = (input: unknown): input is DateValue =>
  ifElse(isDateInput, (candidate: Date): boolean => isValid(candidate), () => false)(input)

export const formatDateIso = (date: DateValue): string => formatISO(date)

export const formatDateIsoDate = (date: DateValue): string => formatISO(date, { representation: 'date' })

export const compareDates = (left: DateValue, right: DateValue): number => compareAsc(left, right)

// ISO date parser for ACL period interpretation (strict YYYY-MM-DD)
export type IsoDateString = string

export type IsoDateParseError = {
  readonly kind: 'InvalidIsoDate'
  readonly input: string
}

const isoDateRegex = /^(\d{4})-(\d{2})-(\d{2})$/

const describe = (v: unknown): string => String(v)

const handleValidCandidate = (candidate: unknown) => {
  const str = String(candidate)
  const parsed = parseISO(str)

  const err: IsoDateParseError = { kind: 'InvalidIsoDate', input: describe(candidate) }

  return ifElse(
    (_: unknown) => isValid(parsed),
    (_: unknown) => success(formatDateIsoDate(parsed)),
    (_: unknown) => failure(err),
  )(null)
}

export const parseIsoDate = (input: unknown): Result<IsoDateString, IsoDateParseError> => {
  const err: IsoDateParseError = { kind: 'InvalidIsoDate', input: describe(input) }

  return ifElse(
    (candidate: unknown) => isoDateRegex.test(String(candidate)),
    handleValidCandidate,
    (_: unknown) => failure(err),
  )(input)
}

export default parseIsoDate
