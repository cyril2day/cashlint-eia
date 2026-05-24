import type { Signal } from '@/contexts/interpretation/model/signal'
import { formatGeographyScope } from '@/contexts/measurement/model/geography-scope'
import { formatMeasurementUnit } from '@/contexts/measurement/model/measurement-unit'
import { formatReportWeekIso } from '@/contexts/measurement/model/report-week'
import { cond } from '@/shared/fp'

export const oilLintPresentationFormattingLabels: Readonly<{
  readonly inventory: string
  readonly price: string
  readonly unavailable: string
}> = {
  inventory: 'Inventory formatting pending',
  price: 'Price formatting pending',
  unavailable: 'Unavailable values stay explicit',
}

export const formatSummaryReportWeekText = (reportWeek: Signal['reportWeek']): string =>
  formatReportWeekIso(reportWeek)

export const formatSummaryGeographyText = (geography: Signal['geography']): string =>
  formatGeographyScope(geography)

const wholeNumberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

const decimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})

const fixedMoneyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const percentageFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

const formatSignalAmount = (signal: Signal): string =>
  cond<[Signal], string>([
    [candidate => candidate.unit.unit === 'USDPerBarrel', candidate => fixedMoneyFormatter.format(candidate.value)],
    [candidate => candidate.unit.unit === 'Percent', candidate => percentageFormatter.format(candidate.value)],
    [candidate => candidate.unit.unit === 'ThousandBarrels', candidate => wholeNumberFormatter.format(candidate.value)],
    [candidate => candidate.unit.unit === 'ThousandBarrelsPerDay', candidate => wholeNumberFormatter.format(candidate.value)],
    [() => true, candidate => decimalFormatter.format(candidate.value)],
  ])(signal)

export const formatSummarySignalValueText = (signal: Signal): string =>
  `${formatSignalAmount(signal)} ${formatMeasurementUnit(signal.unit)}`

export const formatSummarySignalSubtitleText = (signal: Signal): string =>
  `${formatReportWeekIso(signal.reportWeek)} · ${formatGeographyScope(signal.geography)}`
