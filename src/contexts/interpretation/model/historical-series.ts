import { brand } from '@/shared/domain'
import { formatMeasurementUnit, type MeasurementUnit } from '@/contexts/measurement/model/measurement-unit'
import { formatSignalIdentity, type SignalIdentity } from '@/contexts/interpretation/model/signal-identity'
import type { HistoricalObservation } from '@/contexts/interpretation/model/historical-observation'

const historicalSeriesBrand = Symbol('HistoricalSeries')

export type HistoricalSeries = Readonly<{
  readonly identity: SignalIdentity
  readonly unit: MeasurementUnit
  readonly observations: readonly HistoricalObservation[]
  readonly [historicalSeriesBrand]: true
}>

export const createHistoricalSeries = (
  identity: SignalIdentity,
  unit: MeasurementUnit,
  observations: readonly HistoricalObservation[],
): HistoricalSeries => ({
  identity,
  unit,
  observations,
  [historicalSeriesBrand]: true,
  ...brand(historicalSeriesBrand),
})

export const formatHistoricalSeries = (series: HistoricalSeries): string =>
  [
    formatSignalIdentity(series.identity),
    formatMeasurementUnit(series.unit),
    String(series.observations.length),
  ].join('|')
