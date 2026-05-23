import type { ContextualizedSignal } from '@/contexts/interpretation/model/contextualized-signal'
import { matchMaybe, some, type Maybe } from '@/shared/maybe'
import type { HistogramBinStrategy, HistogramMarkerViewModel, HistogramValueViewModel, HistogramViewModel } from '../contracts'
import {
  baselineAverageMarker,
  chartCaveatsFromSignal,
  chartDisplayStateFromHistory,
  createSignalAccessibilitySummary,
  HistoricalSignalPointInput,
  reportWeekIso,
  signalCurrentMarkerLabel,
  sortHistoricalPoints,
  unitLabelFromSignal,
} from './shared'

type HistogramMapperInput = Readonly<{
  readonly id: string
  readonly title: string
  readonly subtitle: Maybe<string>
  readonly signal: ContextualizedSignal
  readonly historicalPoints: readonly HistoricalSignalPointInput[]
  readonly binStrategy: HistogramBinStrategy
}>

const toHistogramValue = (point: HistoricalSignalPointInput): HistogramValueViewModel => ({
  value: point.value,
  label: reportWeekIso(point.reportWeek),
})

const currentMarkerFromSignal = (signal: ContextualizedSignal): Maybe<HistogramMarkerViewModel> =>
  some({
    value: signal.signal.value,
    label: signalCurrentMarkerLabel(signal),
  })

const baselineReferenceMarkers = (signal: ContextualizedSignal): readonly HistogramMarkerViewModel[] =>
  matchMaybe<HistogramMarkerViewModel, readonly HistogramMarkerViewModel[]>({
    Some: marker => [marker],
    None: () => [],
  })(baselineAverageMarker(signal, average => ({
        value: average,
        label: `Baseline ${String(average)}`,
      })))

export const mapContextualizedSignalToHistogram = (input: HistogramMapperInput): HistogramViewModel => {
  const sorted = sortHistoricalPoints(input.historicalPoints)
  const values = sorted.map(toHistogramValue)

  return {
    id: input.id,
    title: input.title,
    subtitle: input.subtitle,
    unitLabel: unitLabelFromSignal(input.signal),
    values,
    binStrategy: input.binStrategy,
    currentMarker: currentMarkerFromSignal(input.signal),
    referenceMarkers: baselineReferenceMarkers(input.signal),
    caveats: chartCaveatsFromSignal(input.signal),
    accessibilitySummary: createSignalAccessibilitySummary(input.signal, values.length),
    displayState: chartDisplayStateFromHistory(input.signal, values.length),
  }
}
