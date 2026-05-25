import type { ContextualizedSignal } from '@/contexts/interpretation/model/contextualized-signal'
import { matchMaybe, some, type Maybe } from '@/shared/maybe'
import { formatDecimal } from '@/shared/decimal'
import type { BoxPlotMarkerViewModel, BoxPlotViewModel, FiveNumberSummaryViewModel } from '@/presentation/charts/contracts'
import {
  baselineAverageMarker,
  chartCaveatsFromSignal,
  chartDisplayStateFromHistory,
  createSignalAccessibilitySummary,
  HistoricalSignalPointInput,
  signalCurrentMarkerLabel,
  unitLabelFromSignal,
} from '@/presentation/charts/mappers/shared'

type BoxPlotMapperInput = Readonly<{
  readonly id: string
  readonly title: string
  readonly subtitle: Maybe<string>
  readonly signal: ContextualizedSignal
  readonly historicalPoints: readonly HistoricalSignalPointInput[]
  readonly summary: Maybe<FiveNumberSummaryViewModel>
  readonly outliers: readonly BoxPlotMarkerViewModel[]
}>

const currentMarkerFromSignal = (signal: ContextualizedSignal): Maybe<BoxPlotMarkerViewModel> =>
  some({
    value: signal.signal.value,
    label: signalCurrentMarkerLabel(signal),
  })

const baselineReferenceMarkers = (signal: ContextualizedSignal): readonly BoxPlotMarkerViewModel[] =>
  matchMaybe<BoxPlotMarkerViewModel, readonly BoxPlotMarkerViewModel[]>({
    Some: marker => [marker],
    None: () => [],
  })(baselineAverageMarker(signal, average => ({
    value: average,
    label: `Baseline ${formatDecimal(average)}`,
  })))

export const mapContextualizedSignalToBoxPlot = (input: BoxPlotMapperInput): BoxPlotViewModel => ({
  id: input.id,
  title: input.title,
  subtitle: input.subtitle,
  unitLabel: unitLabelFromSignal(input.signal),
  summary: input.summary,
  outliers: input.outliers,
  currentMarker: currentMarkerFromSignal(input.signal),
  referenceMarkers: baselineReferenceMarkers(input.signal),
  caveats: chartCaveatsFromSignal(input.signal),
  accessibilitySummary: createSignalAccessibilitySummary(input.signal, input.historicalPoints.length),
  displayState: chartDisplayStateFromHistory(input.signal, input.historicalPoints.length),
})
