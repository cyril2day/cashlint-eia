import { ifElse } from '@/shared/fp'

export const walkingSkeletonInventorySeriesIds: readonly string[] = ['WCRSTUS1', 'W_EPC0_SAX_YCUOK_MBBL']

export const walkingSkeletonInventoryUnitCandidates: readonly string[] = ['MBBL']

export const walkingSkeletonInventoryEndpoint = '/v2/petroleum/stoc/wstk/data/'

export const isWalkingSkeletonInventorySeriesId = (seriesId: string): boolean =>
  walkingSkeletonInventorySeriesIds.some(candidate => candidate === seriesId)

export const isWalkingSkeletonInventoryUnitCandidate = (unitCandidate: string): boolean =>
  walkingSkeletonInventoryUnitCandidates.some(candidate => candidate === unitCandidate)

export const isWalkingSkeletonInventoryPeriodCandidate = (periodCandidate: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(periodCandidate)

export const isWalkingSkeletonInventoryNumericCandidate = (valueCandidate: string | number): boolean =>
  ifElse(
    (candidate: string | number) => typeof candidate === 'number',
    (candidate: number) => Number.isFinite(candidate),
    (candidate: string) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(candidate.trim()),
  )(valueCandidate)