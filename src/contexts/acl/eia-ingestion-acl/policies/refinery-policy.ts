import { parseDecimal } from '@/shared/decimal'
import { isSuccess } from '@/shared/result'

export const coreWeeklyRefinerySeriesIdentifiers: readonly string[] = ['WCRRIUS2', 'WGIRIUS2', 'WOCLEUS2', 'WPULEUS3']

export const coreWeeklyRefineryMeasureKindCandidates: readonly string[] = ['RefineryNetInput', 'RefineryGrossInput', 'RefineryOperableCapacity', 'RefineryUtilization']

export const coreWeeklyRefineryUnitCandidates: readonly string[] = ['mbbl/d', 'thousand barrels per day', 'thousandbarrelsperday', 'pct', '%']

export const coreWeeklyRefineryEndpoint = '/v2/petroleum/pnp/wiup/data/'

export const isCoreWeeklyRefinerySeriesIdentifier = (seriesId: string): boolean =>
  coreWeeklyRefinerySeriesIdentifiers.some(candidate => candidate === seriesId)

export const isCoreWeeklyRefineryMeasureKindCandidate = (measureKindCandidate: string): boolean =>
  coreWeeklyRefineryMeasureKindCandidates.some(candidate => candidate === measureKindCandidate)

export const isCoreWeeklyRefineryUnitCandidate = (unitCandidate: string): boolean =>
  coreWeeklyRefineryUnitCandidates.some(candidate => candidate === unitCandidate.trim().toLowerCase())

export const isCoreWeeklyRefineryPeriodCandidate = (periodCandidate: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(periodCandidate)

export const isCoreWeeklyRefineryNumericCandidate = (valueCandidate: unknown): boolean =>
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
