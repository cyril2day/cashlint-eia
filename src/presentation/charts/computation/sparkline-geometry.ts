import { line, scaleLinear } from 'd3'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'
import { chartDomainBounds, numericDomain, toSvgPathMaybe } from '@/shared/chart-svg'
import type { ChartDimensions, SparklineViewModel } from '../contracts'

type GeometryPoint = Readonly<{ readonly x: number; readonly y: number }>

export type SparklineGeometry = Readonly<{
  readonly linePath: Maybe<string>
  readonly currentMarker: Maybe<Readonly<{ readonly x: number; readonly y: number }>>
  readonly dimensions: ChartDimensions
}>

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
  const xDomain = numericDomain(viewModel.points.map(point => point.x))
  const yDomain = numericDomain(viewModel.points.map(point => point.y))

  const xScale = scaleLinear()
    .domain(chartDomainBounds(xDomain))
    .range([dimensions.margin.left, dimensions.margin.left + dimensions.innerWidth])

  const yScale = scaleLinear()
    .domain(chartDomainBounds(yDomain))
    .range([dimensions.margin.top + dimensions.innerHeight, dimensions.margin.top])

  const pathBuilder = line<GeometryPoint>()
    .x((point: GeometryPoint) => xScale(point.x))
    .y((point: GeometryPoint) => yScale(point.y))

  return {
    linePath: toSvgPathMaybe(pathBuilder(viewModel.points)),
    currentMarker: currentMarker(viewModel, xScale, yScale),
    dimensions,
  }
}
