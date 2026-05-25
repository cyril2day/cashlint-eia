import { parseDecimal } from '@/shared/decimal'
import { isSuccess } from '@/shared/result'

export const coreWeeklySupplySeriesIdentifiers: readonly string[] = ['WCRFPUS2', 'WCRIMUS2', 'WCREXUS2']

export const coreWeeklySupplyMeasureKindCandidates: readonly string[] = ['DomesticProduction', 'Imports', 'Exports']

export const coreWeeklySupplyUnitCandidates: readonly string[] = ['mbbl/d', 'thousand barrels per day', 'thousandbarrelsperday']

export const coreWeeklySupplyEndpoint = '/v2/petroleum/sum/sndw/data/'

export const isCoreWeeklySupplySeriesIdentifier = (seriesId: string): boolean =>
  coreWeeklySupplySeriesIdentifiers.some(candidate => candidate === seriesId)

export const isCoreWeeklySupplyMeasureKindCandidate = (measureKindCandidate: string): boolean =>
  coreWeeklySupplyMeasureKindCandidates.some(candidate => candidate === measureKindCandidate)

export const isCoreWeeklySupplyUnitCandidate = (unitCandidate: string): boolean =>
  coreWeeklySupplyUnitCandidates.some(candidate => candidate === unitCandidate.trim().toLowerCase())

export const isCoreWeeklySupplyPeriodCandidate = (periodCandidate: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(periodCandidate)

export const isCoreWeeklySupplyNumericCandidate = (valueCandidate: unknown): boolean =>
  isSuccess(parseDecimal(valueCandidate))

export const mapSeriesIdToSupplyMeasureKind = (seriesId: string): string | undefined => {
  const mapping: Record<string, string> = {
    WCRFPUS2: 'DomesticProduction',
    WCRIMUS2: 'Imports',
    WCREXUS2: 'Exports',
  }
  return mapping[seriesId]
}
