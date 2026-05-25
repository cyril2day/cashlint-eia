import type { Maybe } from '@/shared/maybe'
import type { ChartCaveatViewModel } from '@/presentation/charts/contracts/chart-caveat-view-model'
import type { ChartDisplayState } from '@/presentation/charts/contracts/chart-display-state'

export type FiveNumberSummaryViewModel = Readonly<{
  readonly minimum: number
  readonly firstQuartile: number
  readonly median: number
  readonly thirdQuartile: number
  readonly maximum: number
}>

export type BoxPlotMarkerViewModel = Readonly<{
  readonly value: number
  readonly label: string
}>

export type BoxPlotViewModel = Readonly<{
  readonly id: string
  readonly title: string
  readonly subtitle: Maybe<string>
  readonly unitLabel: Maybe<string>
  readonly summary: Maybe<FiveNumberSummaryViewModel>
  readonly outliers: readonly BoxPlotMarkerViewModel[]
  readonly currentMarker: Maybe<BoxPlotMarkerViewModel>
  readonly referenceMarkers: readonly BoxPlotMarkerViewModel[]
  readonly caveats: readonly ChartCaveatViewModel[]
  readonly accessibilitySummary: string
  readonly displayState: ChartDisplayState
}>
