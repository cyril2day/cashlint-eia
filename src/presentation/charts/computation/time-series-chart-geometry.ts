import { line, scaleLinear } from 'd3'
import { formatDecimal } from '@/shared/decimal'
import { ifElse } from '@/shared/fp'
import { none, some, matchMaybe, type Maybe } from '@/shared/maybe'
import { firstArrayItem, isNonEmptyArray } from '@/shared/collection'
import { chartDomainBounds, numericDomain, toSvgPathMaybe, type ChartDomain } from '@/shared/chart-svg'
import type { ChartDimensions, TimeSeriesChartViewModel } from '@/presentation/charts/contracts'

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
  readonly dimensions: ChartDimensions
}>

export type TimeSeriesChartGeometryOptions = Readonly<{
  readonly xTickCount: number
  readonly yTickCount: number
}>

const defaultTimeSeriesChartGeometryOptions: TimeSeriesChartGeometryOptions = {
  xTickCount: 3,
  yTickCount: 5,
}

const xAxisTickInset = 14

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

const yDomainMaximum = (values: readonly number[]): number =>
  Math.max(1, ...values)

const timeSeriesYDomain = (values: readonly number[]): ChartDomain => ({
  minimum: 0,
  maximum: yDomainMaximum(values) * 1.08,
})

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

const boundedTickCount = (
  requestedTickCount: number,
  pointCount: number,
): number =>
  Math.max(2, Math.min(8, pointCount, Math.floor(requestedTickCount)))

const pointAtIndex = (
  points: readonly [TimeSeriesChartViewModel['points'][number], ...TimeSeriesChartViewModel['points'][number][]],
  index: number,
): TimeSeriesChartViewModel['points'][number] =>
  ifElse(
    (candidate: TimeSeriesChartViewModel['points'][number] | undefined): candidate is TimeSeriesChartViewModel['points'][number] => typeof candidate === 'object',
    candidate => candidate,
    () => firstArrayItem(points),
  )(points[index])

const xTickPoints = (
  points: readonly [TimeSeriesChartViewModel['points'][number], ...TimeSeriesChartViewModel['points'][number][]],
  requestedTickCount: number,
): readonly TimeSeriesChartViewModel['points'][number][] =>
  Array.from(
    new Map(
      Array.from(
        { length: boundedTickCount(requestedTickCount, points.length) },
        (_, index) => {
          const denominator = boundedTickCount(requestedTickCount, points.length) - 1
          const pointIndex = Math.round((points.length - 1) * (index / denominator))

          return pointAtIndex(points, pointIndex)
        },
      ).map(point => [point.reportWeekIso, point]),
    ).values(),
  )

const xTickCoordinate = (
  dimensions: ChartDimensions,
  tickCount: number,
  index: number,
): number =>
  dimensions.margin.left + xAxisTickInset + ((dimensions.innerWidth - (xAxisTickInset * 2)) * (index / Math.max(1, tickCount - 1)))

const xTickMark =
  (dimensions: ChartDimensions, tickCount: number) =>
  (point: TimeSeriesChartViewModel['points'][number], index: number): TimeSeriesChartAxisTick => ({
    value: point.x,
    coordinate: xTickCoordinate(dimensions, tickCount, index),
    label: point.reportWeekIso,
  })

const xTickMarksFromPoints =
  (dimensions: ChartDimensions, requestedTickCount: number) =>
  (points: readonly [TimeSeriesChartViewModel['points'][number], ...TimeSeriesChartViewModel['points'][number][]]): readonly TimeSeriesChartAxisTick[] => {
    const ticks = xTickPoints(points, requestedTickCount)

    return ticks.map(xTickMark(dimensions, ticks.length))
  }

const xTickMarks = (
  viewModel: TimeSeriesChartViewModel,
  dimensions: ChartDimensions,
  requestedTickCount: number,
): readonly TimeSeriesChartAxisTick[] =>
  ifElse(
    isNonEmptyArray<TimeSeriesChartViewModel['points'][number]>,
    xTickMarksFromPoints(dimensions, requestedTickCount),
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
  options: TimeSeriesChartGeometryOptions = defaultTimeSeriesChartGeometryOptions,
): TimeSeriesChartGeometry => {
  const xDomain = numericDomain(viewModel.points.map(point => point.x))
  const yDomain = timeSeriesYDomain([
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
  const xTicks = xScale.ticks(options.xTickCount)
  const yTicks = yScale.ticks(options.yTickCount)

  return {
    linePath: path,
    xTicks,
    yTicks,
    xTickMarks: xTickMarks(viewModel, dimensions, options.xTickCount),
    yTickMarks: yTickMarks(yTicks, yScale),
    currentMarker: currentMarker(viewModel, xScale, yScale),
    dimensions,
  }
}
