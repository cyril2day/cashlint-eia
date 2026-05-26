import { line, scaleLinear } from 'd3'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'
import { chartDomainBounds, numericDomain, toSvgPathMaybe } from '@/shared/chart-svg'
import type { ChartDimensions } from '@/presentation/charts/contracts'
import type { SparklineWidgetInput } from '@/presentation/charts/widgets/sparkline/sparkline-widget'

type GeometryPoint = Readonly<{ readonly x: number; readonly y: number }>

export type SparklineGeometry = Readonly<{
  readonly linePath: Maybe<string>
  readonly currentMarker: Maybe<Readonly<{ readonly x: number; readonly y: number }>>
  readonly dimensions: ChartDimensions
}>

const currentMarker = (
  input: SparklineWidgetInput,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Maybe<Readonly<{ readonly x: number; readonly y: number }>> =>
  matchMaybe<SparklineWidgetInput['points'][number], Maybe<Readonly<{ readonly x: number; readonly y: number }>>>({
    Some: candidate =>
      some({
        x: xScale(candidate.x),
        y: yScale(candidate.y),
      }),
    None: () => none(),
  })(input.currentPoint)

export const composeSparklineGeometry = (
  input: SparklineWidgetInput,
  dimensions: ChartDimensions,
): SparklineGeometry => {
  const xDomain = numericDomain(input.points.map(point => point.x))
  const yDomain = numericDomain(input.points.map(point => point.y))

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
    linePath: toSvgPathMaybe(pathBuilder(input.points)),
    currentMarker: currentMarker(input, xScale, yScale),
    dimensions,
  }
}
