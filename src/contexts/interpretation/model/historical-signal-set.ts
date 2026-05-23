import type { HistoricalSeries } from './historical-series'

export type HistoricalSignalSet = Readonly<{
  readonly inventory: HistoricalSeries
  readonly price: HistoricalSeries
}>