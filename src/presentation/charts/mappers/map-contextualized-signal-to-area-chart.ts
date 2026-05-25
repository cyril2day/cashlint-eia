import type { ContextualizedSignal } from '@/contexts/interpretation/model/contextualized-signal'
import { formatDecimal } from '@/shared/decimal'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'
import type { AreaChartBaselineViewModel, AreaChartMarkerViewModel, AreaChartPointViewModel, AreaChartViewModel } from '@/presentation/charts/contracts'
import {
  chartCaveatsFromSignal,
  chartDisplayStateFromHistory,
  createSignalAccessibilitySummary,
  currentPointFromHistory,
  HistoricalSignalPointInput,
  reportWeekIso,
  signalCurrentMarkerLabel,
  sortHistoricalPoints,
  unitLabelFromSignal,
} from '@/presentation/charts/mappers/shared'

type AreaChartMapperInput = Readonly<{
  readonly id: string
  readonly title: string
  readonly subtitle: Maybe<string>
  readonly signal: ContextualizedSignal
  readonly historicalPoints: readonly HistoricalSignalPointInput[]
  readonly baseline: Maybe<AreaChartBaselineViewModel>
}>

const toAreaPoint = (
  point: HistoricalSignalPointInput,
): AreaChartPointViewModel => ({
  x: point.reportWeek.date.getTime(),
  y: some(point.value),
  reportWeekIso: reportWeekIso(point.reportWeek),
  valueLabel: some(formatDecimal(point.value)),
  caveats: [],
})

const toCurrentMarker = (
  signal: ContextualizedSignal,
  point: AreaChartPointViewModel,
): AreaChartMarkerViewModel => ({
  x: point.x,
  y: signal.signal.value,
  label: signalCurrentMarkerLabel(signal),
})

const currentMarkerFromPoints = (
  signal: ContextualizedSignal,
  points: readonly AreaChartPointViewModel[],
): Maybe<AreaChartMarkerViewModel> =>
  matchMaybe<AreaChartPointViewModel, Maybe<AreaChartMarkerViewModel>>({
    Some: point => some(toCurrentMarker(signal, point)),
    None: () => none(),
  })(currentPointFromHistory(points))

export const mapContextualizedSignalToAreaChart = (input: AreaChartMapperInput): AreaChartViewModel => {
  const sorted = sortHistoricalPoints(input.historicalPoints)
  const points = sorted.map(toAreaPoint)

  return {
    id: input.id,
    title: input.title,
    subtitle: input.subtitle,
    unitLabel: unitLabelFromSignal(input.signal),
    points,
    baseline: input.baseline,
    currentMarker: currentMarkerFromPoints(input.signal, points),
    referenceMarkers: [],
    caveats: chartCaveatsFromSignal(input.signal),
    accessibilitySummary: createSignalAccessibilitySummary(input.signal, points.length),
    displayState: chartDisplayStateFromHistory(input.signal, points.length),
  }
}
