import type { ContextualizedSignal } from '@/contexts/interpretation/model/contextualized-signal'
import { none, type Maybe } from '@/shared/maybe'
import type { MetricCardComparisonViewModel, MetricCardViewModel, SparklineViewModel } from '@/presentation/charts/contracts'
import {
  anomalyStatusLabelFromSignal,
  chartCaveatsFromSignal,
  chartDisplayStateFromSignal,
  signalValueLabel,
  trendLabelFromSignal,
  unitLabelFromSignal,
} from '@/presentation/charts/mappers/shared'

type MetricCardMapperInput = Readonly<{
  readonly id: string
  readonly title: string
  readonly signal: ContextualizedSignal
  readonly comparison: Maybe<MetricCardComparisonViewModel>
  readonly sparkline: Maybe<SparklineViewModel>
}>

const metricAccessibilitySummary = (input: MetricCardMapperInput): string =>
  [
    input.title,
    signalValueLabel(input.signal),
    chartDisplayStateFromSignal(input.signal).toLowerCase(),
  ].join(', ')

export const mapContextualizedSignalToMetricCard = (input: MetricCardMapperInput): MetricCardViewModel => ({
  id: input.id,
  title: input.title,
  valueLabel: signalValueLabel(input.signal),
  unitLabel: unitLabelFromSignal(input.signal),
  comparison: input.comparison,
  trendLabel: trendLabelFromSignal(input.signal),
  statusLabel: anomalyStatusLabelFromSignal(input.signal),
  caveats: chartCaveatsFromSignal(input.signal),
  sparkline: input.sparkline,
  accessibilitySummary: metricAccessibilitySummary(input),
  displayState: chartDisplayStateFromSignal(input.signal),
})

export const mapContextualizedSignalToStandaloneMetricCard = (
  input: Omit<MetricCardMapperInput, 'comparison' | 'sparkline'>,
): MetricCardViewModel =>
  mapContextualizedSignalToMetricCard({
    ...input,
    comparison: none(),
    sparkline: none(),
  })
