import type { HistoricalSeries } from '@/contexts/interpretation/model/historical-series'

export type HistoricalSignalSet = Readonly<{
  readonly inventory: HistoricalSeries
  readonly price: HistoricalSeries
}>