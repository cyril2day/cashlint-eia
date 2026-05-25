import { parseDecimal } from '@/shared/decimal'
import { isSuccess } from '@/shared/result'

export const coreWeeklyInventorySeriesIds: readonly string[] = ['WCRSTUS1', 'W_EPC0_SAX_YCUOK_MBBL']

export const coreWeeklyInventoryUnitCandidates: readonly string[] = ['mbbl', 'thousand barrels', 'thousandbarrels']

export const coreWeeklyInventoryEndpoint = '/v2/petroleum/stoc/wstk/data/'

export const isCoreWeeklyInventorySeriesId = (seriesId: string): boolean =>
  coreWeeklyInventorySeriesIds.some(candidate => candidate === seriesId)

export const isCoreWeeklyInventoryUnitCandidate = (unitCandidate: string): boolean =>
  coreWeeklyInventoryUnitCandidates.some(candidate => candidate === unitCandidate.trim().toLowerCase())

export const isCoreWeeklyInventoryPeriodCandidate = (periodCandidate: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(periodCandidate)

export const isCoreWeeklyInventoryNumericCandidate = (valueCandidate: unknown): boolean =>
  isSuccess(parseDecimal(valueCandidate))