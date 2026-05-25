import type {
  AreaChartViewModel,
  BarChartViewModel,
  BoxPlotViewModel,
  HistogramViewModel,
  MetricCardViewModel,
  SparklineViewModel,
  TimeSeriesChartViewModel,
  VarianceChartViewModel,
} from '@/presentation/charts/contracts'
import type { Maybe } from '@/shared/maybe'

import type { PresentationCaveatViewModel } from './presentation-caveat-view-model'
import type { PresentationDisplayState } from './presentation-display-state'

export type ChartPanelKind =
  | 'TimeSeries'
  | 'Sparkline'
  | 'MetricCard'
  | 'BarChart'
  | 'Histogram'
  | 'BoxPlot'
  | 'AreaChart'
  | 'VarianceChart'

export type ChartPanelPayload =
  | TimeSeriesChartViewModel
  | SparklineViewModel
  | MetricCardViewModel
  | BarChartViewModel
  | HistogramViewModel
  | BoxPlotViewModel
  | AreaChartViewModel
  | VarianceChartViewModel

export type ChartPanelViewModel = Readonly<{
  readonly id: string
  readonly title: string
  readonly description: Maybe<string>
  readonly chartKind: ChartPanelKind
  readonly chartViewModel: ChartPanelPayload
  readonly state: PresentationDisplayState
  readonly caveats: readonly PresentationCaveatViewModel[]
  readonly accessibilitySummary: string
}>
