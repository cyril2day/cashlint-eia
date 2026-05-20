import { parseDecimal } from '@/shared/decimal'
import { isSuccess } from '@/shared/result'

export const walkingSkeletonPriceSeriesIdentifiers: readonly string[] = ['RWTC', 'EPCWTIR']

export const walkingSkeletonPriceMeasureKindCandidates: readonly string[] = ['WTISpotPrice']

export const walkingSkeletonPriceUnitCandidates: readonly string[] = ['USD/bbl']

export const walkingSkeletonPriceEndpoint = '/v2/petroleum/pri/spt/data/'

export const isWalkingSkeletonPriceSeriesIdentifier = (seriesId: string): boolean =>
  walkingSkeletonPriceSeriesIdentifiers.some(candidate => candidate === seriesId)

export const isWalkingSkeletonPriceMeasureKindCandidate = (measureKindCandidate: string): boolean =>
  walkingSkeletonPriceMeasureKindCandidates.some(candidate => candidate === measureKindCandidate)

export const isWalkingSkeletonPriceUnitCandidate = (unitCandidate: string): boolean =>
  walkingSkeletonPriceUnitCandidates.some(candidate => candidate === unitCandidate)

export const isWalkingSkeletonPricePeriodCandidate = (periodCandidate: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(periodCandidate)

export const isWalkingSkeletonPriceNumericCandidate = (valueCandidate: unknown): boolean =>
  isSuccess(parseDecimal(valueCandidate))