import { line, scaleLinear } from 'd3'
import { formatDecimal } from '@/shared/decimal'
import { ifElse } from '@/shared/fp'
import { none, some, matchMaybe, type Maybe } from '@/shared/maybe'
import { firstArrayItem, isNonEmptyArray, lastArrayItem } from '@/shared/collection'
import { chartDomainBounds, numericDomain, paddedNumericDomain, toSvgPathMaybe } from '@/shared/chart-svg'
import type { ChartDimensions, TimeSeriesChartViewModel } from '../contracts'

type GeometryPoint = Readonly<{ readonly x: number; readonly y: number }>

export type TimeSeriesChartAxisTick = Readonly<{
  readonly value: number
  readonly coordinate: number
  readonly label: string
}>

export type TimeSeriesChartGeometry = Readonly<{
  readonly linePath: Maybe<string>
  readonly xTicks: readonly number[]
  readonly yTicks: readonly number[]
  readonly xTickMarks: readonly TimeSeriesChartAxisTick[]
  readonly yTickMarks: readonly TimeSeriesChartAxisTick[]
  readonly currentMarker: Maybe<Readonly<{ readonly x: number; readonly y: number }>>
  readonly baselineBand: Maybe<Readonly<{ readonly yTop: number; readonly yBottom: number }>>
  readonly dimensions: ChartDimensions
}>

const hasComputedBaseline = (
  baseline: TimeSeriesChartViewModel['baseline'],
): baseline is Extract<TimeSeriesChartViewModel['baseline'], { readonly kind: 'Computed' }> =>
  baseline.kind === 'Computed'

const baselineDomainValues = (
  baseline: TimeSeriesChartViewModel['baseline'],
): readonly number[] =>
  ifElse(
    hasComputedBaseline,
    candidate => [candidate.lowerBound, candidate.average, candidate.upperBound],
    () => [],
  )(baseline)

const baselineBand = (
  viewModel: TimeSeriesChartViewModel,
  yScale: (value: number) => number,
): Maybe<Readonly<{ readonly yTop: number; readonly yBottom: number }>> =>
  ifElse(
    hasComputedBaseline,
    baseline =>
      some({
        yTop: yScale(baseline.upperBound),
        yBottom: yScale(baseline.lowerBound),
      }),
    () => none(),
  )(viewModel.baseline)

const currentMarker = (
  viewModel: TimeSeriesChartViewModel,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Maybe<Readonly<{ readonly x: number; readonly y: number }>> =>
  matchMaybe<TimeSeriesChartViewModel['points'][number], Maybe<Readonly<{ readonly x: number; readonly y: number }>>>({
    Some: candidate =>
      some({
        x: xScale(candidate.x),
        y: yScale(candidate.y),
      }),
    None: () => none(),
  })(viewModel.currentPoint)

const closerToTick =
  (tick: number, currentClosest: TimeSeriesChartViewModel['points'][number]) =>
  (candidate: TimeSeriesChartViewModel['points'][number]): TimeSeriesChartViewModel['points'][number] =>
    ifElse(
      (point: TimeSeriesChartViewModel['points'][number]) =>
        Math.abs(point.x - tick) < Math.abs(currentClosest.x - tick),
      point => point,
      () => currentClosest,
    )(candidate)

const closestPointForTick =
  (points: readonly [TimeSeriesChartViewModel['points'][number], ...TimeSeriesChartViewModel['points'][number][]]) =>
  (tick: number): TimeSeriesChartViewModel['points'][number] =>
    points.reduce(
      (currentClosest, candidate) => closerToTick(tick, currentClosest)(candidate),
      firstArrayItem(points),
    )

const middleTickValue = (
  points: readonly [TimeSeriesChartViewModel['points'][number], ...TimeSeriesChartViewModel['points'][number][]],
): number =>
  (firstArrayItem(points).x + lastArrayItem(points).x) / 2

const xTickPoints = (
  points: readonly [TimeSeriesChartViewModel['points'][number], ...TimeSeriesChartViewModel['points'][number][]],
): readonly TimeSeriesChartViewModel['points'][number][] =>
  Array.from(new Map([
    firstArrayItem(points),
    closestPointForTick(points)(middleTickValue(points)),
    lastArrayItem(points),
  ].map(point => [point.reportWeekIso, point])).values())

const xTickMarks = (
  viewModel: TimeSeriesChartViewModel,
  xScale: (value: number) => number,
): readonly TimeSeriesChartAxisTick[] =>
  ifElse(
    isNonEmptyArray<TimeSeriesChartViewModel['points'][number]>,
    points => xTickPoints(points).map(point => ({
      value: point.x,
      coordinate: xScale(point.x),
      label: point.reportWeekIso,
    })),
    () => [],
  )(viewModel.points)

const yTickMarks = (
  ticks: readonly number[],
  yScale: (value: number) => number,
): readonly TimeSeriesChartAxisTick[] =>
  ticks.map(tick => ({
    value: tick,
    coordinate: yScale(tick),
    label: formatDecimal(tick),
  }))

export const composeTimeSeriesChartGeometry = (
  viewModel: TimeSeriesChartViewModel,
  dimensions: ChartDimensions,
): TimeSeriesChartGeometry => {
  const xDomain = numericDomain(viewModel.points.map(point => point.x))
  const yDomain = paddedNumericDomain([
    ...viewModel.points.map(point => point.y),
    ...baselineDomainValues(viewModel.baseline),
  ])

  const xScale = scaleLinear()
    .domain(chartDomainBounds(xDomain))
    .range([dimensions.margin.left, dimensions.margin.left + dimensions.innerWidth])

  const yScale = scaleLinear()
    .domain(chartDomainBounds(yDomain))
    .range([dimensions.margin.top + dimensions.innerHeight, dimensions.margin.top])

  const pathBuilder = line<GeometryPoint>()
    .x((point: GeometryPoint) => xScale(point.x))
    .y((point: GeometryPoint) => yScale(point.y))

  const path = toSvgPathMaybe(pathBuilder(viewModel.points))
  const xTicks = xScale.ticks(5)
  const yTicks = yScale.ticks(5)

  return {
    linePath: path,
    xTicks,
    yTicks,
    xTickMarks: xTickMarks(viewModel, xScale),
    yTickMarks: yTickMarks(yTicks, yScale),
    currentMarker: currentMarker(viewModel, xScale, yScale),
    baselineBand: baselineBand(viewModel, yScale),
    dimensions,
  }
}
