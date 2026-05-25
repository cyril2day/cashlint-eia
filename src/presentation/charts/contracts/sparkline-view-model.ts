import type { Maybe } from '@/shared/maybe'
import type { ChartCaveatViewModel } from './chart-caveat-view-model'
import type { ChartDisplayState } from './chart-display-state'

export type SparklinePointViewModel = Readonly<{
  readonly x: number
  readonly y: number
  readonly reportWeekIso: string
  readonly isCurrent: boolean
}>

export type SparklineViewModel = Readonly<{
  readonly id: string
  readonly label: string
  readonly points: readonly SparklinePointViewModel[]
  readonly currentPoint: Maybe<SparklinePointViewModel>
  readonly caveats: readonly ChartCaveatViewModel[]
  readonly accessibilitySummary: string
  readonly displayState: ChartDisplayState
}>
