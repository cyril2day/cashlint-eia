import { parseDecimal } from '@/shared/decimal'
import { isSuccess } from '@/shared/result'

export const walkingSkeletonRefinerySeriesIdentifiers: readonly string[] = ['WCRRIUS2', 'WGIRIUS2', 'WOCLEUS2', 'WPULEUS3']

export const walkingSkeletonRefineryMeasureKindCandidates: readonly string[] = ['RefineryNetInput', 'RefineryGrossInput', 'RefineryOperableCapacity', 'RefineryUtilization']

export const walkingSkeletonRefineryUnitCandidates: readonly string[] = ['mbbl/d', 'thousand barrels per day', 'thousandbarrelsperday', 'pct', '%']

export const walkingSkeletonRefineryEndpoint = '/v2/petroleum/pnp/wiup/data/'

export const isWalkingSkeletonRefinerySeriesIdentifier = (seriesId: string): boolean =>
  walkingSkeletonRefinerySeriesIdentifiers.some(candidate => candidate === seriesId)

export const isWalkingSkeletonRefineryMeasureKindCandidate = (measureKindCandidate: string): boolean =>
  walkingSkeletonRefineryMeasureKindCandidates.some(candidate => candidate === measureKindCandidate)

export const isWalkingSkeletonRefineryUnitCandidate = (unitCandidate: string): boolean =>
  walkingSkeletonRefineryUnitCandidates.some(candidate => candidate === unitCandidate.trim().toLowerCase())

export const isWalkingSkeletonRefineryPeriodCandidate = (periodCandidate: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(periodCandidate)

export const isWalkingSkeletonRefineryNumericCandidate = (valueCandidate: unknown): boolean =>
  isSuccess(parseDecimal(valueCandidate))

export const mapSeriesIdToRefineryMeasureKind = (seriesId: string): string | undefined => {
  const mapping: Record<string, string> = {
    WCRRIUS2: 'RefineryNetInput',
    WGIRIUS2: 'RefineryGrossInput',
    WOCLEUS2: 'RefineryOperableCapacity',
    WPULEUS3: 'RefineryUtilization',
  }
  return mapping[seriesId]
}
