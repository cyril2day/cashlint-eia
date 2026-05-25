import { brand } from '@/shared/domain'
import type { Decimal } from '@/shared/decimal'
import { formatGeographyScope, type GeographyScope } from '@/contexts/measurement/model/geography-scope'
import { formatMeasurementUnit, type MeasurementUnit } from '@/contexts/measurement/model/measurement-unit'
import { formatPetroleumSlice, type PetroleumSlice } from '@/contexts/measurement/model/petroleum-slice'
import type { ReportWeek } from '@/contexts/measurement/model/report-week'
import { formatSignalIdentity, type InventorySignalIdentity, type PriceSignalIdentity, type SignalIdentity } from '@/contexts/interpretation/model/signal-identity'

const signalBrand = Symbol('Signal')

export type Signal = Readonly<{
  readonly identity: SignalIdentity
  readonly reportWeek: ReportWeek
  readonly geography: GeographyScope
  readonly value: Decimal
  readonly unit: MeasurementUnit
  readonly sourceKind: PetroleumSlice
  readonly [signalBrand]: true
}>

export const createSignal = (
  identity: SignalIdentity,
  reportWeek: ReportWeek,
  geography: GeographyScope,
  value: Decimal,
  unit: MeasurementUnit,
  sourceKind: PetroleumSlice,
): Signal => ({
  identity,
  reportWeek,
  geography,
  value,
  unit,
  sourceKind,
  [signalBrand]: true,
  ...brand(signalBrand),
})

export const createInventorySignal = (
  identity: InventorySignalIdentity,
  reportWeek: ReportWeek,
  geography: GeographyScope,
  value: Decimal,
  unit: MeasurementUnit,
  sourceKind: PetroleumSlice,
): Signal => createSignal(identity, reportWeek, geography, value, unit, sourceKind)

export const createPriceSignal = (
  identity: PriceSignalIdentity,
  reportWeek: ReportWeek,
  geography: GeographyScope,
  value: Decimal,
  unit: MeasurementUnit,
  sourceKind: PetroleumSlice,
): Signal => createSignal(identity, reportWeek, geography, value, unit, sourceKind)

export const formatSignal = (signal: Signal): string =>
  [formatSignalIdentity(signal.identity), signal.reportWeek.toString(), formatGeographyScope(signal.geography), String(signal.value), formatMeasurementUnit(signal.unit), formatPetroleumSlice(signal.sourceKind)].join('|')
