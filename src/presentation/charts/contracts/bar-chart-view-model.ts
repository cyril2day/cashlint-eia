import type { Maybe } from '@/shared/maybe'
import type { ChartCaveatViewModel } from './chart-caveat-view-model'
import type { ChartDisplayState } from './chart-display-state'

export type BarChartDirection = 'Positive' | 'Negative' | 'Zero'
export type BarChartOrdering = 'InputOrder' | 'AscendingValue' | 'DescendingValue' | 'Custom'

export type BarChartPointViewModel = Readonly<{
  readonly category: string
  readonly value: number
  readonly valueLabel: string
  readonly direction: BarChartDirection
  readonly caveats: readonly ChartCaveatViewModel[]
}>

export type BarChartViewModel = Readonly<{
  readonly id: string
  readonly title: string
  readonly subtitle: Maybe<string>
  readonly unitLabel: Maybe<string>
  readonly ordering: BarChartOrdering
  readonly points: readonly BarChartPointViewModel[]
  readonly caveats: readonly ChartCaveatViewModel[]
  readonly accessibilitySummary: string
  readonly displayState: ChartDisplayState
}>
