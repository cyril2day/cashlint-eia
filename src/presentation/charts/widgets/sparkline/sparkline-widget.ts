import type { Maybe } from '@/shared/maybe'

export type SparklineWidgetPoint = Readonly<{
  readonly x: number
  readonly y: number
}>

export type SparklineWidgetInput = Readonly<{
  readonly label: string
  readonly points: readonly SparklineWidgetPoint[]
  readonly currentPoint: Maybe<SparklineWidgetPoint>
  readonly accessibilitySummary: string
}>
