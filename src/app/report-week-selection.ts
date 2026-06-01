import { currentIsoDate, parseIsoDate } from '@/shared/date'
import { ifElse } from '@/shared/fp'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'
import { isSuccess, type Result } from '@/shared/result'

export type ReportWeekSearchParamValue = string | readonly string[] | undefined

export type ReportWeekSearchParams = Readonly<Record<string, ReportWeekSearchParamValue>>

export type ReportWeekSelection = Readonly<{
  readonly requestReportWeekIso: string
  readonly controlReportWeekIso: Maybe<string>
}>

const isStringValue = (value: ReportWeekSearchParamValue): value is string => typeof value === 'string'

const trimTextToMaybe = (value: string): Maybe<string> =>
  ifElse(
    (candidate: string) => candidate.trim().length > 0,
    candidate => some(candidate.trim()),
    () => none(),
  )(value)

const firstSearchParamText = (values: readonly string[]): Maybe<string> =>
  ifElse(
    (candidate: string | undefined): candidate is string => typeof candidate === 'string',
    trimTextToMaybe,
    () => none(),
  )(values[0])

const isStringArray = (value: ReportWeekSearchParamValue): value is readonly string[] =>
  Array.isArray(value)

const searchParamTextAfterString = (value: ReportWeekSearchParamValue): Maybe<string> =>
  ifElse(
    isStringArray,
    firstSearchParamText,
    () => none(),
  )(value)

const searchParamText = (value: ReportWeekSearchParamValue): Maybe<string> =>
  ifElse(
    isStringValue,
    trimTextToMaybe,
    searchParamTextAfterString,
  )(value)

const isoDateMaybeFromResult = (result: Result<string, unknown>): Maybe<string> =>
  ifElse(
    isSuccess,
    candidate => some(candidate.value),
    () => none(),
  )(result)

const normalizeReportWeekText = (value: string): Maybe<string> =>
  isoDateMaybeFromResult(parseIsoDate(value))

const selectedReportWeekSelection = (reportWeekIso: string): ReportWeekSelection => ({
  requestReportWeekIso: reportWeekIso,
  controlReportWeekIso: some(reportWeekIso),
})

const latestReportWeekSelection = (): ReportWeekSelection =>
  selectedReportWeekSelection(currentIsoDate())

const reportWeekSelectionFromMaybe = (reportWeekIso: Maybe<string>): ReportWeekSelection =>
  matchMaybe<string, ReportWeekSelection>({
    Some: selectedReportWeekSelection,
    None: latestReportWeekSelection,
  })(reportWeekIso)

export const resolveReportWeekSelection = (params: ReportWeekSearchParams): ReportWeekSelection =>
  matchMaybe<string, ReportWeekSelection>({
    Some: value => reportWeekSelectionFromMaybe(normalizeReportWeekText(value)),
    None: latestReportWeekSelection,
  })(searchParamText(params.reportWeek))
