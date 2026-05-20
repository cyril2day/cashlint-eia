import { parseIsoDate } from '@/shared/date'
import { bindResult, mapError } from '@/shared/result'
import type { Result } from '@/shared/result'
import { parseReportWeek, type ReportWeek, type ReportWeekParseError } from '@/contexts/measurement/model/report-week'

export type PeriodCandidate = string | number

export const mapPeriodCandidateToReportWeek = (
  candidate: PeriodCandidate,
): Result<ReportWeek, ReportWeekParseError> => {
  const makeReportWeekParseError = (input: string): ReportWeekParseError => ({ kind: 'InvalidReportWeekInput', input })

  const isoOrErr = mapError(parseIsoDate(String(candidate)), () => makeReportWeekParseError(String(candidate)))

  return bindResult(isoOrErr, iso => parseReportWeek(iso))
}
