import React from 'react'

import type { AreaChartWidgetBaseline, AreaChartWidgetError, AreaChartWidgetInput, AreaChartWidgetMarker, AreaChartWidgetOutput, AreaChartWidgetPoint } from '@/presentation/charts/widgets/area-chart/area-chart-widget'
import { computeAreaChartOutput } from '@/presentation/charts/widgets/area-chart/area-chart-widget'
import { ChartErrorMessage, type ChartErrorMessageViewModel } from '@/presentation/charts/components/chart-error-message'
import { cond, ifElse } from '@/shared/fp'
import { firstArrayItem, lastArrayItem } from '@/shared/collection'
import { matchMaybe } from '@/shared/maybe'
import { formatDecimal, formatDecimalCoordinate } from '@/shared/decimal'
import { isSuccess, type Result } from '@/shared/result'
import {
  type ChartDomain,
  type ChartSvgPoint,
  defaultChartSvgFrame,
  firstChartPoint,
  lastChartPoint,
  paddedNumericDomain,
  scaleXInFrame,
  scaleYInFrame,
  svgPointList,
} from '@/shared/chart-svg'

type AreaChartRenderablePoints = AreaChartWidgetOutput['points']

const domainValues = (
  input: AreaChartWidgetInput,
  points: readonly AreaChartWidgetPoint[],
): readonly number[] => [
  ...points.map(point => point.y),
  ...matchMaybe<AreaChartWidgetMarker, readonly number[]>({
    Some: marker => [marker.y],
    None: () => [],
  })(input.currentMarker),
  ...input.referenceMarkers.map(marker => marker.y),
]

const yDomainMaximum = (
  input: AreaChartWidgetInput,
  points: AreaChartRenderablePoints,
): number =>
  Math.max(1, ...domainValues(input, points))

const areaYDomain = (
  input: AreaChartWidgetInput,
  points: AreaChartRenderablePoints,
): ChartDomain => ({
  minimum: 0,
  maximum: yDomainMaximum(input, points) * 1.08,
})

const scaledPoint =
  (xScale: (value: number) => number, yScale: (value: number) => number) =>
  (point: AreaChartWidgetPoint): ChartSvgPoint => ({
    x: xScale(point.x),
    y: yScale(point.y),
  })

const scaledPoints =
  (xScale: (value: number) => number, yScale: (value: number) => number) =>
  (points: AreaChartRenderablePoints): readonly [ChartSvgPoint, ...ChartSvgPoint[]] => [
    scaledPoint(xScale, yScale)(firstArrayItem(points)),
    ...points.slice(1).map(scaledPoint(xScale, yScale)),
  ]

const areaPolygonPoints = (
  chartPoints: readonly [ChartSvgPoint, ...ChartSvgPoint[]],
  baselineY: number,
): readonly ChartSvgPoint[] => [
  {
    x: firstChartPoint(chartPoints).x,
    y: baselineY,
  },
  ...chartPoints,
  {
    x: lastChartPoint(chartPoints).x,
    y: baselineY,
  },
]

const middlePointIndex = (points: AreaChartRenderablePoints): number =>
  Math.floor((points.length - 1) / 2)

const middlePoint = (points: AreaChartRenderablePoints): AreaChartWidgetPoint =>
  points[middlePointIndex(points)]

const xTickPoints = (points: AreaChartRenderablePoints): readonly AreaChartWidgetPoint[] => [
  firstArrayItem(points),
  middlePoint(points),
  lastArrayItem(points),
]

const yTickValues = (domain: ChartDomain): readonly number[] => [
  domain.minimum,
  domain.maximum / 2,
  domain.maximum,
]

const yTick =
  (yScale: (value: number) => number) =>
  (value: number) => (
    <g key={value} className="area-chart__y-tick">
      <line
        className="area-chart__grid-line"
        x1={formatDecimalCoordinate(defaultChartSvgFrame.plotX)}
        x2={formatDecimalCoordinate(defaultChartSvgFrame.plotX + defaultChartSvgFrame.plotWidth)}
        y1={formatDecimalCoordinate(yScale(value))}
        y2={formatDecimalCoordinate(yScale(value))}
      />
      <text
        className="area-chart__axis-label"
        x={formatDecimalCoordinate(defaultChartSvgFrame.plotX - 6)}
        y={formatDecimalCoordinate(yScale(value) + 4)}
        textAnchor="end"
      >
        {formatDecimal(value)}
      </text>
    </g>
  )

const xTick =
  (xScale: (value: number) => number) =>
  (point: AreaChartWidgetPoint) => (
    <text
      key={`${point.xLabel}-${formatDecimalCoordinate(point.x)}`}
      className="area-chart__axis-label"
      x={formatDecimalCoordinate(xScale(point.x))}
      y={formatDecimalCoordinate(defaultChartSvgFrame.height - 4)}
      textAnchor="middle"
    >
      {point.xLabel}
    </text>
  )

const areaAxis = (
  points: AreaChartRenderablePoints,
  yDomain: ChartDomain,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
) => (
  <g className="area-chart__axes">
    {yTickValues(yDomain).map(yTick(yScale))}
    <line
      className="area-chart__axis"
      x1={formatDecimalCoordinate(defaultChartSvgFrame.plotX)}
      x2={formatDecimalCoordinate(defaultChartSvgFrame.plotX)}
      y1={formatDecimalCoordinate(defaultChartSvgFrame.plotY)}
      y2={formatDecimalCoordinate(defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight)}
    />
    <line
      className="area-chart__axis"
      x1={formatDecimalCoordinate(defaultChartSvgFrame.plotX)}
      x2={formatDecimalCoordinate(defaultChartSvgFrame.plotX + defaultChartSvgFrame.plotWidth)}
      y1={formatDecimalCoordinate(defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight)}
      y2={formatDecimalCoordinate(defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight)}
    />
    {xTickPoints(points).map(xTick(xScale))}
  </g>
)

const baselineLabel = (
  input: AreaChartWidgetInput,
  baselineY: number,
) =>
  matchMaybe<AreaChartWidgetBaseline, React.ReactNode>({
    Some: baseline => (
      <text
        className="area-chart__baseline-label"
        x={formatDecimalCoordinate(defaultChartSvgFrame.plotX + defaultChartSvgFrame.plotWidth)}
        y={formatDecimalCoordinate(baselineY - 4)}
        textAnchor="end"
      >
        {baseline.label}
      </text>
    ),
    None: () => null,
  })(input.baseline)

const referenceMarker =
  (xScale: (value: number) => number, yScale: (value: number) => number) =>
  (marker: AreaChartWidgetMarker) => (
    <circle
      key={marker.label}
      className="area-chart__reference-marker"
      cx={formatDecimalCoordinate(xScale(marker.x))}
      cy={formatDecimalCoordinate(yScale(marker.y))}
      r="3"
    />
  )

const currentMarker = (
  input: AreaChartWidgetInput,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
) =>
  matchMaybe<AreaChartWidgetMarker, React.ReactNode>({
    Some: marker => (
      <circle
        className="area-chart__current-marker"
        cx={formatDecimalCoordinate(xScale(marker.x))}
        cy={formatDecimalCoordinate(yScale(marker.y))}
        r="4"
      />
    ),
    None: () => null,
  })(input.currentMarker)

const areaSvgFromPoints = (
  input: AreaChartWidgetInput,
  output: AreaChartWidgetOutput,
) => {
  const points = output.points
  const baseline = output.baseline
  const xScale = scaleXInFrame(paddedNumericDomain(points.map(point => point.x)), defaultChartSvgFrame)
  const yDomain = areaYDomain(input, points)
  const yScale = scaleYInFrame(yDomain, defaultChartSvgFrame)
  const chartPoints = scaledPoints(xScale, yScale)(points)
  const baselineY = yScale(baseline)

  return (
    <svg
      className="area-chart__svg"
      viewBox={`0 0 ${defaultChartSvgFrame.width} ${defaultChartSvgFrame.height}`}
      role="img"
      aria-label={input.accessibilitySummary}
    >
      {areaAxis(points, yDomain, xScale, yScale)}
      <line
        className="area-chart__baseline"
        x1={formatDecimalCoordinate(defaultChartSvgFrame.plotX)}
        x2={formatDecimalCoordinate(defaultChartSvgFrame.plotX + defaultChartSvgFrame.plotWidth)}
        y1={formatDecimalCoordinate(baselineY)}
        y2={formatDecimalCoordinate(baselineY)}
      />
      <polygon
        className="area-chart__area"
        points={svgPointList(areaPolygonPoints(chartPoints, baselineY))}
      />
      <polyline
        className="area-chart__line"
        points={svgPointList(chartPoints)}
      />
      {baselineLabel(input, baselineY)}
      {input.referenceMarkers.map(referenceMarker(xScale, yScale))}
      {currentMarker(input, xScale, yScale)}
    </svg>
  )
}

const areaChartErrorMessage = (error: AreaChartWidgetError): ChartErrorMessageViewModel =>
  cond<[AreaChartWidgetError], ChartErrorMessageViewModel>([
    [
      candidate => candidate.kind === 'InsufficientPoints',
      () => ({
        title: 'Area chart needs at least two points',
        message: 'A filled area requires a line segment before there is a shape to render.',
      }),
    ],
    [
      candidate => candidate.kind === 'InvalidXValue',
      () => ({
        title: 'Area chart x values are invalid',
        message: 'Every x value must be a finite number.',
      }),
    ],
    [
      candidate => candidate.kind === 'InvalidYValue',
      () => ({
        title: 'Area chart y values are invalid',
        message: 'Every y value must be a finite number.',
      }),
    ],
    [
      candidate => candidate.kind === 'DuplicateXValue',
      () => ({
        title: 'Area chart x values must be unique',
        message: 'Duplicate x values would make the filled shape ambiguous.',
      }),
    ],
    [
      candidate => candidate.kind === 'InvalidBaseline',
      () => ({
        title: 'Area chart baseline is not renderable',
        message: 'This simple area chart renders from a zero baseline only.',
      }),
    ],
    [
      candidate => candidate.kind === 'NegativeYValue',
      () => ({
        title: 'Area chart cannot render negative values',
        message: 'This simple area chart starts at zero, so negative values need a different chart treatment.',
      }),
    ],
    [
      () => true,
      () => ({
        title: 'Area chart input could not be rendered',
        message: 'The chart input failed validation before rendering.',
      }),
    ],
  ])(error)

const areaSvgFromResult =
  (input: AreaChartWidgetInput) =>
  (result: Result<AreaChartWidgetOutput, AreaChartWidgetError>) =>
    ifElse(
      isSuccess<AreaChartWidgetOutput, AreaChartWidgetError>,
      value => areaSvgFromPoints(input, value.value),
      value => <ChartErrorMessage error={areaChartErrorMessage(value.error)} />,
    )(result)

const areaSvg = (input: AreaChartWidgetInput) =>
  ifElse(
    (candidate: AreaChartWidgetInput) => candidate.points.length > 0,
    candidate => areaSvgFromResult(candidate)(computeAreaChartOutput(candidate)),
    () => <ChartErrorMessage error={areaChartErrorMessage({ kind: 'InsufficientPoints' })} />,
  )(input)

export function AreaChart({ input }: Readonly<{ readonly input: AreaChartWidgetInput }>) {
  return (
    <figure className="area-chart" aria-label={input.accessibilitySummary}>
      {areaSvg(input)}
    </figure>
  )
}
