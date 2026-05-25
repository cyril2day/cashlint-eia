import React from 'react'

import type { SparklinePointViewModel, SparklineViewModel } from '@/presentation/charts/contracts'
import type { SparklineGeometry } from '@/presentation/charts/computation'
import { firstArrayItem, isNonEmptyArray, lastArrayItem } from '@/shared/collection'
import { formatDecimal, formatDecimalCoordinate } from '@/shared/decimal'
import { ifElse } from '@/shared/fp'
import { SparklineLinePath } from '@/presentation/charts/components/sparkline/sparkline-line-path'
import { SparklineCurrentMarker } from '@/presentation/charts/components/sparkline/sparkline-current-marker'

type SparklineProps = Readonly<{
  readonly viewModel: SparklineViewModel
  readonly geometry: SparklineGeometry
}>

const xAxisY = (geometry: SparklineGeometry): number =>
  geometry.dimensions.margin.top + geometry.dimensions.innerHeight

const yAxisX = (geometry: SparklineGeometry): number =>
  geometry.dimensions.margin.left

const sparklineValueRange = (points: readonly [SparklinePointViewModel, ...SparklinePointViewModel[]]) => ({
  minimum: Math.min(...points.map(point => point.y)),
  maximum: Math.max(...points.map(point => point.y)),
})

const timeLabels = (
  points: readonly [SparklinePointViewModel, ...SparklinePointViewModel[]],
  geometry: SparklineGeometry,
) => (
  <g className="oil-lint-sparkline__time-labels">
    <text
      className="oil-lint-sparkline__axis-tick-label"
      x={formatDecimalCoordinate(yAxisX(geometry))}
      y={formatDecimalCoordinate(xAxisY(geometry) + 14)}
      textAnchor="start"
    >
      {firstArrayItem(points).reportWeekIso}
    </text>
    <text
      className="oil-lint-sparkline__axis-tick-label"
      x={formatDecimalCoordinate(geometry.dimensions.margin.left + geometry.dimensions.innerWidth)}
      y={formatDecimalCoordinate(xAxisY(geometry) + 14)}
      textAnchor="end"
    >
      {lastArrayItem(points).reportWeekIso}
    </text>
  </g>
)

const valueLabels = (
  points: readonly [SparklinePointViewModel, ...SparklinePointViewModel[]],
  geometry: SparklineGeometry,
) => {
  const range = sparklineValueRange(points)

  return (
    <g className="oil-lint-sparkline__value-labels">
      <text
        className="oil-lint-sparkline__axis-tick-label"
        x={formatDecimalCoordinate(yAxisX(geometry) - 4)}
        y={formatDecimalCoordinate(geometry.dimensions.margin.top + 4)}
        textAnchor="end"
      >
        {formatDecimal(range.maximum)}
      </text>
      <text
        className="oil-lint-sparkline__axis-tick-label"
        x={formatDecimalCoordinate(yAxisX(geometry) - 4)}
        y={formatDecimalCoordinate(xAxisY(geometry))}
        textAnchor="end"
      >
        {formatDecimal(range.minimum)}
      </text>
    </g>
  )
}

const axes = (viewModel: SparklineViewModel, geometry: SparklineGeometry) =>
  ifElse(
    isNonEmptyArray<SparklinePointViewModel>,
    points => (
      <g className="oil-lint-sparkline__axes">
        <line
          className="oil-lint-sparkline__axis"
          x1={formatDecimalCoordinate(yAxisX(geometry))}
          x2={formatDecimalCoordinate(yAxisX(geometry))}
          y1={formatDecimalCoordinate(geometry.dimensions.margin.top)}
          y2={formatDecimalCoordinate(xAxisY(geometry))}
        />
        <line
          className="oil-lint-sparkline__axis"
          x1={formatDecimalCoordinate(yAxisX(geometry))}
          x2={formatDecimalCoordinate(geometry.dimensions.margin.left + geometry.dimensions.innerWidth)}
          y1={formatDecimalCoordinate(xAxisY(geometry))}
          y2={formatDecimalCoordinate(xAxisY(geometry))}
        />
        {valueLabels(points, geometry)}
        {timeLabels(points, geometry)}
      </g>
    ),
    () => null,
  )(viewModel.points)

export function Sparkline({ viewModel, geometry }: SparklineProps) {
  return (
    <figure className="oil-lint-sparkline" aria-label={viewModel.accessibilitySummary}>
      <svg
        className="oil-lint-sparkline__svg"
        width={geometry.dimensions.outerWidth}
        height={geometry.dimensions.outerHeight}
        role="img"
        aria-label={viewModel.accessibilitySummary}
      >
        {axes(viewModel, geometry)}
        <SparklineLinePath linePath={geometry.linePath} />
        <SparklineCurrentMarker marker={geometry.currentMarker} />
      </svg>
      <figcaption className="oil-lint-sparkline__caption">{viewModel.label}</figcaption>
    </figure>
  )
}
