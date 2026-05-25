import type { Signal } from '@/contexts/interpretation/model/signal'
import { formatGeographyScope } from '@/contexts/measurement/model/geography-scope'
import { formatMeasurementUnit } from '@/contexts/measurement/model/measurement-unit'
import { formatReportWeekIso } from '@/contexts/measurement/model/report-week'
import { cond } from '@/shared/fp'
import {
  formatDecimal,
  formatFixedMoneyDecimal,
  formatPercentageDecimal,
  formatWholeDecimal,
} from '@/shared/decimal'

export const oilLintPresentationFormattingLabels: Readonly<{
  readonly inventory: string
  readonly price: string
  readonly unavailable: string
}> = {
  inventory: 'Inventory values use weekly petroleum units',
  price: 'Price values use dollars per barrel',
  unavailable: 'Missing values are named plainly',
}

export const formatSummaryReportWeekText = (reportWeek: Signal['reportWeek']): string =>
  formatReportWeekIso(reportWeek)

export const formatSummaryGeographyText = (geography: Signal['geography']): string =>
  formatGeographyScope(geography)

const formatSignalAmount = (signal: Signal): string =>
  cond<[Signal], string>([
    [candidate => candidate.unit.unit === 'USDPerBarrel', candidate => formatFixedMoneyDecimal(candidate.value)],
    [candidate => candidate.unit.unit === 'Percent', candidate => formatPercentageDecimal(candidate.value)],
    [candidate => candidate.unit.unit === 'ThousandBarrels', candidate => formatWholeDecimal(candidate.value)],
    [candidate => candidate.unit.unit === 'ThousandBarrelsPerDay', candidate => formatWholeDecimal(candidate.value)],
    [() => true, candidate => formatDecimal(candidate.value)],
  ])(signal)

export const formatSummarySignalValueText = (signal: Signal): string =>
  `${formatSignalAmount(signal)} ${formatMeasurementUnit(signal.unit)}`

export const formatSummarySignalSubtitleText = (signal: Signal): string =>
  `${formatReportWeekIso(signal.reportWeek)} · ${formatGeographyScope(signal.geography)}`
