import type { Signal } from '@/contexts/interpretation/model/signal'
import type { GeographyScope } from '@/contexts/measurement/model/geography-scope'
import { formatMeasurementUnit, type MeasurementUnit } from '@/contexts/measurement/model/measurement-unit'
import { formatPADDistrictCode } from '@/contexts/measurement/model/pad-district-code'
import { formatReportWeekIso } from '@/contexts/measurement/model/report-week'
import { cond, ifElse } from '@/shared/fp'
import { formatDateReadable, parseDate, type DateParseError, type DateValue } from '@/shared/date'
import {
  formatDecimal,
  formatFixedMoneyDecimal,
  formatPercentageDecimal,
  formatWholeDecimal,
} from '@/shared/decimal'
import { isSuccess, type Result, type SuccessResult } from '@/shared/result'

export const oilLintPresentationFormattingLabels: Readonly<{
  readonly inventory: string
  readonly price: string
  readonly unavailable: string
}> = {
  inventory: 'Inventory values use weekly petroleum units',
  price: 'Price values use dollars per barrel',
  unavailable: 'Missing values are named plainly',
}

const isDateParseSuccess = (
  result: Result<DateValue, DateParseError>,
): result is SuccessResult<DateValue> => isSuccess(result)

const formatReadableDateFromIso = (isoDate: string): string =>
  ifElse(
    isDateParseSuccess,
    result => formatDateReadable(result.value),
    () => isoDate,
  )(parseDate(isoDate))

const isUSTotalPresentationGeography = (
  geography: GeographyScope,
): geography is Extract<GeographyScope, { readonly kind: 'USTotal' }> =>
  geography.kind === 'USTotal'

const isCushingPresentationGeography = (
  geography: GeographyScope,
): geography is Extract<GeographyScope, { readonly kind: 'Cushing' }> =>
  geography.kind === 'Cushing'

const isPADDistrictPresentationGeography = (
  geography: GeographyScope,
): geography is Extract<GeographyScope, { readonly kind: 'PADDistrict' }> =>
  geography.kind === 'PADDistrict'

const formatPADDistrictPresentationGeography = (geography: GeographyScope): string =>
  ifElse(
    isPADDistrictPresentationGeography,
    candidate => `PADD ${formatPADDistrictCode(candidate.districtCode)}`,
    () => 'U.S. oil market',
  )(geography)

const formatNonUSTotalPresentationGeography = (geography: GeographyScope): string =>
  ifElse(
    isCushingPresentationGeography,
    () => 'Cushing, Oklahoma',
    formatPADDistrictPresentationGeography,
  )(geography)

export const formatSummaryReportWeekText = (reportWeek: Signal['reportWeek']): string =>
  formatReadableDateFromIso(formatReportWeekIso(reportWeek))

export const formatSummaryGeographyText = (geography: GeographyScope): string =>
  ifElse(
    isUSTotalPresentationGeography,
    () => 'United States',
    formatNonUSTotalPresentationGeography,
  )(geography)

const formatSignalAmount = (signal: Signal): string =>
  cond<[Signal], string>([
    [candidate => candidate.unit.unit === 'USDPerBarrel', candidate => formatFixedMoneyDecimal(candidate.value)],
    [candidate => candidate.unit.unit === 'Percent', candidate => formatPercentageDecimal(candidate.value)],
    [candidate => candidate.unit.unit === 'ThousandBarrels', candidate => formatWholeDecimal(candidate.value)],
    [candidate => candidate.unit.unit === 'ThousandBarrelsPerDay', candidate => formatWholeDecimal(candidate.value)],
    [() => true, candidate => formatDecimal(candidate.value)],
  ])(signal)

const formatSummaryMeasurementUnit = (unit: MeasurementUnit): string =>
  cond<[MeasurementUnit], string>([
    [candidate => candidate.unit === 'ThousandBarrels', () => 'thousand barrels'],
    [candidate => candidate.unit === 'MillionBarrels', () => 'million barrels'],
    [candidate => candidate.unit === 'ThousandBarrelsPerDay', () => 'thousand barrels per day'],
    [candidate => candidate.unit === 'Percent', () => 'percent'],
    [candidate => candidate.unit === 'USDPerBarrel', () => 'dollars per barrel'],
    [() => true, formatMeasurementUnit],
  ])(unit)

export const formatSummarySignalValueText = (signal: Signal): string =>
  `${formatSignalAmount(signal)} ${formatSummaryMeasurementUnit(signal.unit)}`

export const formatSummarySignalSubtitleText = (signal: Signal): string =>
  `${formatSummaryReportWeekText(signal.reportWeek)} · ${formatSummaryGeographyText(signal.geography)}`
