import type { Signal } from '@/contexts/interpretation/model/signal'
import { formatGeographyScope } from '@/contexts/measurement/model/geography-scope'
import { formatMeasurementUnit } from '@/contexts/measurement/model/measurement-unit'
import { formatReportWeekIso } from '@/contexts/measurement/model/report-week'

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

export const formatSummarySignalValueText = (signal: Signal): string =>
  `${String(signal.value)} ${formatMeasurementUnit(signal.unit)}`

export const formatSummarySignalSubtitleText = (signal: Signal): string =>
  `${formatReportWeekIso(signal.reportWeek)} · ${formatGeographyScope(signal.geography)}`