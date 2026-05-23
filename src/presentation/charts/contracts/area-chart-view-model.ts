import type { Maybe } from '@/shared/maybe'
import type { ChartCaveatViewModel } from './chart-caveat-view-model'
import type { ChartDisplayState } from './chart-display-state'

export type AreaChartPointViewModel = Readonly<{
  readonly x: number
  readonly y: Maybe<number>
  readonly reportWeekIso: string
  readonly valueLabel: Maybe<string>
  readonly caveats: readonly ChartCaveatViewModel[]
}>

export type AreaChartBaselineViewModel = Readonly<{
  readonly value: number
  readonly label: string
}>

export type AreaChartMarkerViewModel = Readonly<{
  readonly x: number
  readonly y: number
  readonly label: string
}>

export type AreaChartViewModel = Readonly<{
  readonly id: string
  readonly title: string
  readonly subtitle: Maybe<string>
  readonly unitLabel: Maybe<string>
  readonly points: readonly AreaChartPointViewModel[]
  readonly baseline: Maybe<AreaChartBaselineViewModel>
  readonly currentMarker: Maybe<AreaChartMarkerViewModel>
  readonly referenceMarkers: readonly AreaChartMarkerViewModel[]
  readonly caveats: readonly ChartCaveatViewModel[]
  readonly accessibilitySummary: string
  readonly displayState: ChartDisplayState
}>
