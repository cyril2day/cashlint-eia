import type {
  AreaChartViewModel,
  HistogramViewModel,
  SparklineViewModel,
} from '@/presentation/charts/contracts'
import type { Maybe } from '@/shared/maybe'

import type { PresentationCaveatViewModel } from '@/presentation/contracts/presentation-caveat-view-model'
import type { PresentationDisplayState } from '@/presentation/contracts/presentation-display-state'

export type ChartPanelKind =
  | 'Sparkline'
  | 'Histogram'
  | 'AreaChart'

export type ChartPanelPayload =
  | SparklineViewModel
  | HistogramViewModel
  | AreaChartViewModel

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
