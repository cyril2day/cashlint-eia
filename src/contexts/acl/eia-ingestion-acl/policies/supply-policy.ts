import { parseDecimal } from '@/shared/decimal'
import { isSuccess } from '@/shared/result'

export const walkingSkeletonSupplySeriesIdentifiers: readonly string[] = ['WCRFPUS2', 'WCRIMUS2', 'WCREXUS2']

export const walkingSkeletonSupplyMeasureKindCandidates: readonly string[] = ['DomesticProduction', 'Imports', 'Exports']

export const walkingSkeletonSupplyUnitCandidates: readonly string[] = ['mbbl/d', 'thousand barrels per day', 'thousandbarrelsperday']

export const walkingSkeletonSupplyEndpoint = '/v2/petroleum/sum/sndw/data/'

export const isWalkingSkeletonSupplySeriesIdentifier = (seriesId: string): boolean =>
  walkingSkeletonSupplySeriesIdentifiers.some(candidate => candidate === seriesId)

export const isWalkingSkeletonSupplyMeasureKindCandidate = (measureKindCandidate: string): boolean =>
  walkingSkeletonSupplyMeasureKindCandidates.some(candidate => candidate === measureKindCandidate)

export const isWalkingSkeletonSupplyUnitCandidate = (unitCandidate: string): boolean =>
  walkingSkeletonSupplyUnitCandidates.some(candidate => candidate === unitCandidate.trim().toLowerCase())

export const isWalkingSkeletonSupplyPeriodCandidate = (periodCandidate: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(periodCandidate)

export const isWalkingSkeletonSupplyNumericCandidate = (valueCandidate: unknown): boolean =>
  isSuccess(parseDecimal(valueCandidate))

export const mapSeriesIdToSupplyMeasureKind = (seriesId: string): string | undefined => {
  const mapping: Record<string, string> = {
    WCRFPUS2: 'DomesticProduction',
    WCRIMUS2: 'Imports',
    WCREXUS2: 'Exports',
  }
  return mapping[seriesId]
}
