import type { Maybe } from '@/shared/maybe'
import type { ChartCaveatViewModel } from './chart-caveat-view-model'
import type { ChartDisplayState } from './chart-display-state'

export type HistogramBinStrategy =
  | Readonly<{ readonly kind: 'Automatic'; readonly requestedBinCount: number }>
  | Readonly<{ readonly kind: 'ManualThresholds'; readonly thresholds: readonly number[] }>

export type HistogramMarkerViewModel = Readonly<{
  readonly value: number
  readonly label: string
}>

export type HistogramValueViewModel = Readonly<{
  readonly value: number
  readonly label: string
}>

export type HistogramViewModel = Readonly<{
  readonly id: string
  readonly title: string
  readonly subtitle: Maybe<string>
  readonly unitLabel: Maybe<string>
  readonly values: readonly HistogramValueViewModel[]
  readonly binStrategy: HistogramBinStrategy
  readonly currentMarker: Maybe<HistogramMarkerViewModel>
  readonly referenceMarkers: readonly HistogramMarkerViewModel[]
  readonly caveats: readonly ChartCaveatViewModel[]
  readonly accessibilitySummary: string
  readonly displayState: ChartDisplayState
}>
