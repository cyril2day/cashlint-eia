import type { Maybe } from '@/shared/maybe'
import type { ChartCaveatViewModel } from './chart-caveat-view-model'
import type { ChartDisplayState } from './chart-display-state'

export type TimeSeriesChartPointViewModel = Readonly<{
  readonly x: number
  readonly y: number
  readonly reportWeekIso: string
  readonly valueLabel: string
  readonly isCurrent: boolean
}>

export type TimeSeriesBaselineVisualModel =
  | Readonly<{
      readonly kind: 'Computed'
      readonly average: number
      readonly dispersion: number
      readonly lowerBound: number
      readonly upperBound: number
      readonly label: string
    }>
  | Readonly<{
      readonly kind: 'NotComputed'
      readonly reason: string
    }>

export type TimeSeriesAnomalyVisualModel =
  | Readonly<{
      readonly kind: 'Normal'
      readonly score: number
    }>
  | Readonly<{
      readonly kind: 'Anomalous'
      readonly score: number
      readonly direction: 'HighSide' | 'LowSide'
    }>
  | Readonly<{
      readonly kind: 'NotComputed'
      readonly reason: string
    }>

export type TimeSeriesChartViewModel = Readonly<{
  readonly id: string
  readonly title: string
  readonly subtitle: Maybe<string>
  readonly unitLabel: Maybe<string>
  readonly points: readonly TimeSeriesChartPointViewModel[]
  readonly currentPoint: Maybe<TimeSeriesChartPointViewModel>
  readonly baseline: TimeSeriesBaselineVisualModel
  readonly anomaly: TimeSeriesAnomalyVisualModel
  readonly caveats: readonly ChartCaveatViewModel[]
  readonly accessibilitySummary: string
  readonly displayState: ChartDisplayState
}>
