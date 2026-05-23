import { extent, line, scaleLinear } from 'd3'
import { both, ifElse, isNonEmptyString } from '@/shared/fp'
import { none, some, matchMaybe, type Maybe } from '@/shared/maybe'
import type { ChartDimensions, TimeSeriesChartViewModel } from '../contracts'

type GeometryPoint = Readonly<{ readonly x: number; readonly y: number }>

export type TimeSeriesChartGeometry = Readonly<{
  readonly linePath: Maybe<string>
  readonly xTicks: readonly number[]
  readonly yTicks: readonly number[]
  readonly currentMarker: Maybe<Readonly<{ readonly x: number; readonly y: number }>>
  readonly baselineBand: Maybe<Readonly<{ readonly yTop: number; readonly yBottom: number }>>
  readonly dimensions: ChartDimensions
}>

const validExtent = (input: readonly [number | undefined, number | undefined]): input is readonly [number, number] =>
  both(
    (candidate: readonly [number | undefined, number | undefined]) => Number.isFinite(candidate[0]),
    (candidate: readonly [number | undefined, number | undefined]) => Number.isFinite(candidate[1]),
  )(input)

const extentOrFallback = (values: readonly number[]): readonly [number, number] => {
  const computed = extent(values)
  const fallbackDomain: readonly [number, number] = [0, 1]

  return ifElse(
    validExtent,
    candidate => candidate,
    () => fallbackDomain,
  )(computed)
}

const toPathMaybe = (candidate: string | null): Maybe<string> =>
  ifElse(
    isNonEmptyString,
    value => some(String(value)),
    () => none(),
  )(candidate)

const hasComputedBaseline = (
  baseline: TimeSeriesChartViewModel['baseline'],
): baseline is Extract<TimeSeriesChartViewModel['baseline'], { readonly kind: 'Computed' }> =>
  baseline.kind === 'Computed'

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

export const composeTimeSeriesChartGeometry = (
  viewModel: TimeSeriesChartViewModel,
  dimensions: ChartDimensions,
): TimeSeriesChartGeometry => {
  const xDomain = extentOrFallback(viewModel.points.map(point => point.x))
  const yDomain = extentOrFallback(viewModel.points.map(point => point.y))

  const xScale = scaleLinear()
    .domain(xDomain)
    .range([dimensions.margin.left, dimensions.margin.left + dimensions.innerWidth])

  const yScale = scaleLinear()
    .domain(yDomain)
    .range([dimensions.margin.top + dimensions.innerHeight, dimensions.margin.top])

  const pathBuilder = line<GeometryPoint>()
    .x((point: GeometryPoint) => xScale(point.x))
    .y((point: GeometryPoint) => yScale(point.y))

  const path = toPathMaybe(pathBuilder(viewModel.points))

  return {
    linePath: path,
    xTicks: xScale.ticks(5),
    yTicks: yScale.ticks(5),
    currentMarker: currentMarker(viewModel, xScale, yScale),
    baselineBand: baselineBand(viewModel, yScale),
    dimensions,
  }
}
