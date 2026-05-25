import { parseDecimal } from '@/shared/decimal'
import { isSuccess } from '@/shared/result'

export const coreWeeklyPriceSeriesIdentifiers: readonly string[] = ['RWTC', 'EPCWTIR']

export const coreWeeklyPriceMeasureKindCandidates: readonly string[] = ['WTISpotPrice']

export const coreWeeklyPriceUnitCandidates: readonly string[] = ['usd/bbl', '$/bbl', 'usd per barrel', 'dollars per barrel', 'usdperbarrel']

export const coreWeeklyPriceEndpoint = '/v2/petroleum/pri/spt/data/'

export const isCoreWeeklyPriceSeriesIdentifier = (seriesId: string): boolean =>
  coreWeeklyPriceSeriesIdentifiers.some(candidate => candidate === seriesId)

export const isCoreWeeklyPriceMeasureKindCandidate = (measureKindCandidate: string): boolean =>
  coreWeeklyPriceMeasureKindCandidates.some(candidate => candidate === measureKindCandidate)

export const isCoreWeeklyPriceUnitCandidate = (unitCandidate: string): boolean =>
  coreWeeklyPriceUnitCandidates.some(candidate => candidate === unitCandidate.trim().toLowerCase())

export const isCoreWeeklyPricePeriodCandidate = (periodCandidate: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(periodCandidate)

export const isCoreWeeklyPriceNumericCandidate = (valueCandidate: unknown): boolean =>
  isSuccess(parseDecimal(valueCandidate))
