import { cond, ifElse } from '@/shared/fp'
import type { Maybe } from '@/shared/maybe'
import type { BarChartDirection, BarChartOrdering, BarChartPointViewModel, BarChartViewModel, ChartCaveatViewModel, ChartDisplayState } from '../contracts'

export type BarChartPointInput = Readonly<{
  readonly category: string
  readonly value: number
  readonly valueLabel: string
  readonly caveats: readonly ChartCaveatViewModel[]
}>

type BarChartMapperInput = Readonly<{
  readonly id: string
  readonly title: string
  readonly subtitle: Maybe<string>
  readonly unitLabel: Maybe<string>
  readonly ordering: BarChartOrdering
  readonly points: readonly BarChartPointInput[]
  readonly caveats: readonly ChartCaveatViewModel[]
  readonly accessibilitySummary: string
}>

const directionFromValue = (value: number): BarChartDirection =>
  cond<[number], BarChartDirection>([
    [candidate => candidate > 0, () => 'Positive'],
    [candidate => candidate < 0, () => 'Negative'],
    [() => true, () => 'Zero'],
  ])(value)

const toBarChartPoint = (point: BarChartPointInput): BarChartPointViewModel => ({
  category: point.category,
  value: point.value,
  valueLabel: point.valueLabel,
  direction: directionFromValue(point.value),
  caveats: point.caveats,
})

const displayStateFromPoints = (points: readonly BarChartPointInput[]): ChartDisplayState =>
  ifElse(
    (candidate: readonly BarChartPointInput[]) => candidate.length > 0,
    (): ChartDisplayState => 'Complete',
    (): ChartDisplayState => 'Empty',
  )(points)

export const mapBarChartInput = (input: BarChartMapperInput): BarChartViewModel => ({
  id: input.id,
  title: input.title,
  subtitle: input.subtitle,
  unitLabel: input.unitLabel,
  ordering: input.ordering,
  points: input.points.map(toBarChartPoint),
  caveats: input.caveats,
  accessibilitySummary: input.accessibilitySummary,
  displayState: displayStateFromPoints(input.points),
})
