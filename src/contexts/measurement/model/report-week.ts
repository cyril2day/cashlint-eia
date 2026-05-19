import { compareDates, formatDateIsoDate, isDateValue, parseDate, type DateValue } from '@/shared/date'
import { allPass, ifElse } from '@/shared/fp'
import { mapError, mapResult, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, hasBrand, brand } from '@/shared/domain'

const reportWeekBrand = Symbol('ReportWeek')

export type ReportWeek = Readonly<{
  readonly date: DateValue
  readonly frequency: 'weekly'
  readonly [reportWeekBrand]: true
}>

export type ReportWeekParseError = Readonly<{
  readonly kind: 'InvalidReportWeekInput'
  readonly input: string
}>

const hasReportWeekBrand = hasBrand(reportWeekBrand)

const hasWeeklyFrequency = (candidate: object): boolean => Reflect.get(candidate, 'frequency') === 'weekly'

const hasValidDate = (candidate: object): boolean => isDateValue(Reflect.get(candidate, 'date'))

const createReportWeek = (date: DateValue): ReportWeek => ({
  date,
  frequency: 'weekly',
  [reportWeekBrand]: true,
  ...brand(reportWeekBrand),
})

export const isReportWeek = (input: unknown): input is ReportWeek =>
  ifElse(
    isObjectInput,
    allPass([hasReportWeekBrand, hasWeeklyFrequency, hasValidDate]),
    () => false,
  )(input)

export const parseReportWeek = (input: unknown): Result<ReportWeek, ReportWeekParseError> =>
  ifElse(
    isReportWeek,
    (candidate: ReportWeek): Result<ReportWeek, ReportWeekParseError> => success(candidate),
    (candidate: unknown): Result<ReportWeek, ReportWeekParseError> =>
      mapError(
        mapResult(parseDate(candidate), createReportWeek),
        error => ({
          kind: 'InvalidReportWeekInput',
          input: error.input,
        }),
      ),
  )(input)

export const compareReportWeeks = (left: ReportWeek, right: ReportWeek): number =>
  compareDates(left.date, right.date)

export const formatReportWeekIso = (reportWeek: ReportWeek): string =>
  formatDateIsoDate(reportWeek.date)