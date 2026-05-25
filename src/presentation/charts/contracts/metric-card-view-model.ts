import type { Maybe } from '@/shared/maybe'
import type { ChartCaveatViewModel } from '@/presentation/charts/contracts/chart-caveat-view-model'
import type { ChartDisplayState } from '@/presentation/charts/contracts/chart-display-state'
import type { SparklineViewModel } from '@/presentation/charts/contracts/sparkline-view-model'

export type MetricCardComparisonViewModel = Readonly<{
  readonly label: string
  readonly valueLabel: string
  readonly deltaLabel: Maybe<string>
}>

export type MetricCardViewModel = Readonly<{
  readonly id: string
  readonly title: string
  readonly valueLabel: string
  readonly unitLabel: Maybe<string>
  readonly comparison: Maybe<MetricCardComparisonViewModel>
  readonly trendLabel: Maybe<string>
  readonly statusLabel: Maybe<string>
  readonly caveats: readonly ChartCaveatViewModel[]
  readonly sparkline: Maybe<SparklineViewModel>
  readonly accessibilitySummary: string
  readonly displayState: ChartDisplayState
}>
