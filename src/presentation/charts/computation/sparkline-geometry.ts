import { extent, line, scaleLinear } from 'd3'
import { both, ifElse, isNonEmptyString } from '@/shared/fp'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'
import type { ChartDimensions, SparklineViewModel } from '../contracts'

type GeometryPoint = Readonly<{ readonly x: number; readonly y: number }>

export type SparklineGeometry = Readonly<{
  readonly linePath: Maybe<string>
  readonly currentMarker: Maybe<Readonly<{ readonly x: number; readonly y: number }>>
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

const currentMarker = (
  viewModel: SparklineViewModel,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Maybe<Readonly<{ readonly x: number; readonly y: number }>> =>
  matchMaybe<SparklineViewModel['points'][number], Maybe<Readonly<{ readonly x: number; readonly y: number }>>>({
    Some: candidate =>
      some({
        x: xScale(candidate.x),
        y: yScale(candidate.y),
      }),
    None: () => none(),
  })(viewModel.currentPoint)

export const composeSparklineGeometry = (
  viewModel: SparklineViewModel,
  dimensions: ChartDimensions,
): SparklineGeometry => {
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

  return {
    linePath: toPathMaybe(pathBuilder(viewModel.points)),
    currentMarker: currentMarker(viewModel, xScale, yScale),
    dimensions,
  }
}
