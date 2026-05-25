import { brand } from '@/shared/domain'
import type { Decimal } from '@/shared/decimal'
import { formatMeasurementUnit, type MeasurementUnit } from '@/contexts/measurement/model/measurement-unit'
import type { ReportWeek } from '@/contexts/measurement/model/report-week'
import { formatSignalIdentity, type SignalIdentity } from '@/contexts/interpretation/model/signal-identity'

const historicalObservationBrand = Symbol('HistoricalObservation')

export type HistoricalObservation = Readonly<{
  readonly identity: SignalIdentity
  readonly reportWeek: ReportWeek
  readonly value: Decimal
  readonly unit: MeasurementUnit
  readonly [historicalObservationBrand]: true
}>

export const createHistoricalObservation = (
  identity: SignalIdentity,
  reportWeek: ReportWeek,
  value: Decimal,
  unit: MeasurementUnit,
): HistoricalObservation => ({
  identity,
  reportWeek,
  value,
  unit,
  [historicalObservationBrand]: true,
  ...brand(historicalObservationBrand),
})

export const formatHistoricalObservation = (observation: HistoricalObservation): string =>
  [formatSignalIdentity(observation.identity), observation.reportWeek.toString(), String(observation.value), formatMeasurementUnit(observation.unit)].join('|')
