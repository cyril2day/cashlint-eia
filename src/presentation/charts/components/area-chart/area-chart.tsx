import React from 'react'

import type { AreaChartBaselineViewModel, AreaChartMarkerViewModel, AreaChartPointViewModel, AreaChartViewModel } from '../../contracts'
import { ifElse } from '@/shared/fp'
import { firstArrayItem, isNonEmptyArray, lastArrayItem } from '@/shared/collection'
import { matchMaybe } from '@/shared/maybe'
import { formatDecimal, formatDecimalCoordinate } from '@/shared/decimal'
import { renderMaybeText } from '@/presentation/utils/render-maybe-text'
import {
  type ChartDomain,
  type ChartSvgPoint,
  chartValueAxisLabel,
  defaultChartSvgFrame,
  firstChartPoint,
  lastChartPoint,
  paddedNumericDomain,
  scaleXInFrame,
  scaleYInFrame,
  svgPointList,
} from '@/shared/chart-svg'

type AreaChartRenderablePoint = AreaChartPointViewModel & Readonly<{
  readonly yValue: number
}>

const areaPoint = (point: AreaChartPointViewModel) => (
  <li key={point.reportWeekIso} className="area-chart__point">
    <span className="area-chart__point-week">{point.reportWeekIso}</span>
    <span className="area-chart__point-value">{renderMaybeText('No value in this run')(point.valueLabel)}</span>
  </li>
)

const renderablePoint = (point: AreaChartPointViewModel): readonly AreaChartRenderablePoint[] =>
  matchMaybe<number, readonly AreaChartRenderablePoint[]>({
    Some: value => [{
      ...point,
      yValue: value,
    }],
    None: () => [],
  })(point.y)

const renderablePoints = (viewModel: AreaChartViewModel): readonly AreaChartRenderablePoint[] =>
  viewModel.points.flatMap(renderablePoint)

const baselineValue = (
  viewModel: AreaChartViewModel,
  values: readonly number[],
): number =>
  matchMaybe<AreaChartBaselineViewModel, number>({
    Some: baseline => baseline.value,
    None: () => Math.min(...values),
  })(viewModel.baseline)

const domainValues = (
  viewModel: AreaChartViewModel,
  points: readonly AreaChartRenderablePoint[],
): readonly number[] => [
  ...points.map(point => point.yValue),
  ...matchMaybe<AreaChartMarkerViewModel, readonly number[]>({
    Some: marker => [marker.y],
    None: () => [],
  })(viewModel.currentMarker),
  ...viewModel.referenceMarkers.map(marker => marker.y),
]

const scaledPoint =
  (xScale: (value: number) => number, yScale: (value: number) => number) =>
  (point: AreaChartRenderablePoint): ChartSvgPoint => ({
    x: xScale(point.x),
    y: yScale(point.yValue),
  })

const scaledPoints =
  (xScale: (value: number) => number, yScale: (value: number) => number) =>
  (points: readonly [AreaChartRenderablePoint, ...AreaChartRenderablePoint[]]): readonly [ChartSvgPoint, ...ChartSvgPoint[]] => [
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

const areaAxis = (
  viewModel: AreaChartViewModel,
  points: readonly [AreaChartRenderablePoint, ...AreaChartRenderablePoint[]],
  yDomain: ChartDomain,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
) => (
  <g className="area-chart__axes">
    {[yDomain.minimum, yDomain.maximum].map(value => (
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
    ))}
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
    <text
      className="area-chart__axis-label"
      x={formatDecimalCoordinate(xScale(firstArrayItem(points).x))}
      y={formatDecimalCoordinate(defaultChartSvgFrame.height - 4)}
      textAnchor="start"
    >
      {firstArrayItem(points).reportWeekIso}
    </text>
    <text
      className="area-chart__axis-label"
      x={formatDecimalCoordinate(xScale(lastArrayItem(points).x))}
      y={formatDecimalCoordinate(defaultChartSvgFrame.height - 4)}
      textAnchor="end"
    >
      {lastArrayItem(points).reportWeekIso}
    </text>
    <text
      className="area-chart__axis-label"
    transform={`translate(10 ${formatDecimalCoordinate(defaultChartSvgFrame.plotY + (defaultChartSvgFrame.plotHeight / 2))}) rotate(-90)`}
    textAnchor="middle"
  >
      {chartValueAxisLabel(viewModel.unitLabel)}
    </text>
  </g>
)

const baselineLabel = (
  viewModel: AreaChartViewModel,
  baselineY: number,
) =>
  matchMaybe<AreaChartBaselineViewModel, React.ReactNode>({
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
  })(viewModel.baseline)

const referenceMarker =
  (xScale: (value: number) => number, yScale: (value: number) => number) =>
  (marker: AreaChartMarkerViewModel) => (
    <circle
      key={marker.label}
      className="area-chart__reference-marker"
      cx={formatDecimalCoordinate(xScale(marker.x))}
      cy={formatDecimalCoordinate(yScale(marker.y))}
      r="3"
    />
  )

const currentMarker = (
  viewModel: AreaChartViewModel,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
) =>
  matchMaybe<AreaChartMarkerViewModel, React.ReactNode>({
    Some: marker => (
      <circle
        className="area-chart__current-marker"
        cx={formatDecimalCoordinate(xScale(marker.x))}
        cy={formatDecimalCoordinate(yScale(marker.y))}
        r="4"
      />
    ),
    None: () => null,
  })(viewModel.currentMarker)

const areaSvgFromPoints = (
  viewModel: AreaChartViewModel,
  points: readonly [AreaChartRenderablePoint, ...AreaChartRenderablePoint[]],
) => {
  const yValues = domainValues(viewModel, points)
  const baseline = baselineValue(viewModel, yValues)
  const xScale = scaleXInFrame(paddedNumericDomain(points.map(point => point.x)), defaultChartSvgFrame)
  const yDomain = paddedNumericDomain([...yValues, baseline])
  const yScale = scaleYInFrame(yDomain, defaultChartSvgFrame)
  const chartPoints = scaledPoints(xScale, yScale)(points)
  const baselineY = yScale(baseline)

  return (
    <svg
      className="area-chart__svg"
      viewBox={`0 0 ${defaultChartSvgFrame.width} ${defaultChartSvgFrame.height}`}
      role="img"
      aria-label={viewModel.accessibilitySummary}
    >
      {areaAxis(viewModel, points, yDomain, xScale, yScale)}
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
      {baselineLabel(viewModel, baselineY)}
      {viewModel.referenceMarkers.map(referenceMarker(xScale, yScale))}
      {currentMarker(viewModel, xScale, yScale)}
    </svg>
  )
}

const areaSvg = (viewModel: AreaChartViewModel) =>
  ifElse(
    isNonEmptyArray<AreaChartRenderablePoint>,
    points => areaSvgFromPoints(viewModel, points),
    () => <p className="area-chart__empty">No weekly points landed in this area view yet.</p>,
  )(renderablePoints(viewModel))

const points = (viewModel: AreaChartViewModel) =>
  ifElse(
    (candidate: AreaChartViewModel) => candidate.points.length > 0,
    candidate => <ul className="area-chart__points">{candidate.points.map(areaPoint)}</ul>,
    () => <p className="area-chart__empty">No weekly points landed in this area view yet.</p>,
  )(viewModel)

export function AreaChart({ viewModel }: Readonly<{ readonly viewModel: AreaChartViewModel }>) {
  return (
    <figure className="area-chart" aria-label={viewModel.accessibilitySummary}>
      {areaSvg(viewModel)}
      {points(viewModel)}
    </figure>
  )
}
