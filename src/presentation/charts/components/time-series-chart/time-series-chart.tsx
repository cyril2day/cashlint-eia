import React from 'react'

import type { TimeSeriesChartViewModel } from '@/presentation/charts/contracts'
import type { TimeSeriesChartAxisTick, TimeSeriesChartGeometry } from '@/presentation/charts/computation'
import { formatDecimalCoordinate } from '@/shared/decimal'
import { chartValueAxisLabel } from '@/shared/chart-svg'
import { TimeSeriesChartBaselineBand } from '@/presentation/charts/components/time-series-chart/time-series-chart-baseline-band'
import { TimeSeriesChartLinePath } from '@/presentation/charts/components/time-series-chart/time-series-chart-line-path'
import { TimeSeriesChartCurrentMarker } from '@/presentation/charts/components/time-series-chart/time-series-chart-current-marker'
import { TimeSeriesChartCaveats } from '@/presentation/charts/components/time-series-chart/time-series-chart-caveats'

type TimeSeriesChartProps = Readonly<{
  readonly viewModel: TimeSeriesChartViewModel
  readonly geometry: TimeSeriesChartGeometry
}>

const clipPathId = (viewModel: TimeSeriesChartViewModel): string =>
  `${viewModel.id}-plot-clip`

const xAxisY = (geometry: TimeSeriesChartGeometry): number =>
  geometry.dimensions.margin.top + geometry.dimensions.innerHeight

const yAxisX = (geometry: TimeSeriesChartGeometry): number =>
  geometry.dimensions.margin.left

const xTick =
  (geometry: TimeSeriesChartGeometry) =>
  (tick: TimeSeriesChartAxisTick) => (
    <g key={`${tick.value}-${tick.label}`} className="oil-lint-time-series-chart__x-tick">
      <line
        className="oil-lint-time-series-chart__grid-line"
        x1={formatDecimalCoordinate(tick.coordinate)}
        x2={formatDecimalCoordinate(tick.coordinate)}
        y1={formatDecimalCoordinate(geometry.dimensions.margin.top)}
        y2={formatDecimalCoordinate(xAxisY(geometry))}
      />
      <text
        className="oil-lint-time-series-chart__axis-tick-label"
        x={formatDecimalCoordinate(tick.coordinate)}
        y={formatDecimalCoordinate(xAxisY(geometry) + 16)}
        textAnchor="middle"
      >
        {tick.label}
      </text>
    </g>
  )

const yTick =
  (geometry: TimeSeriesChartGeometry) =>
  (tick: TimeSeriesChartAxisTick) => (
    <g key={`${tick.value}-${tick.label}`} className="oil-lint-time-series-chart__y-tick">
      <line
        className="oil-lint-time-series-chart__grid-line"
        x1={formatDecimalCoordinate(yAxisX(geometry))}
        x2={formatDecimalCoordinate(geometry.dimensions.margin.left + geometry.dimensions.innerWidth)}
        y1={formatDecimalCoordinate(tick.coordinate)}
        y2={formatDecimalCoordinate(tick.coordinate)}
      />
      <text
        className="oil-lint-time-series-chart__axis-tick-label"
        x={formatDecimalCoordinate(yAxisX(geometry) - 6)}
        y={formatDecimalCoordinate(tick.coordinate + 4)}
        textAnchor="end"
      >
        {tick.label}
      </text>
    </g>
  )

export function TimeSeriesChart({ viewModel, geometry }: TimeSeriesChartProps) {
  const plotClipPathId = clipPathId(viewModel)

  return (
    <section className="oil-lint-time-series-chart" aria-label={viewModel.accessibilitySummary}>
      <header className="oil-lint-time-series-chart__header">
        <h3 className="oil-lint-time-series-chart__title">{viewModel.title}</h3>
      </header>

      <svg
        className="oil-lint-time-series-chart__svg"
        width={geometry.dimensions.outerWidth}
        height={geometry.dimensions.outerHeight}
        role="img"
        aria-label={viewModel.accessibilitySummary}
      >
        <defs>
          <clipPath id={plotClipPathId}>
            <rect
              x={geometry.dimensions.margin.left}
              y={geometry.dimensions.margin.top}
              width={geometry.dimensions.innerWidth}
              height={geometry.dimensions.innerHeight}
            />
          </clipPath>
        </defs>
        <g className="oil-lint-time-series-chart__axes">
          {geometry.yTickMarks.map(yTick(geometry))}
          {geometry.xTickMarks.map(xTick(geometry))}
          <line
            className="oil-lint-time-series-chart__axis"
            x1={formatDecimalCoordinate(yAxisX(geometry))}
            x2={formatDecimalCoordinate(yAxisX(geometry))}
            y1={formatDecimalCoordinate(geometry.dimensions.margin.top)}
            y2={formatDecimalCoordinate(xAxisY(geometry))}
          />
          <line
            className="oil-lint-time-series-chart__axis"
            x1={formatDecimalCoordinate(yAxisX(geometry))}
            x2={formatDecimalCoordinate(geometry.dimensions.margin.left + geometry.dimensions.innerWidth)}
            y1={formatDecimalCoordinate(xAxisY(geometry))}
            y2={formatDecimalCoordinate(xAxisY(geometry))}
          />
          <text
            className="oil-lint-time-series-chart__axis-label"
            x={formatDecimalCoordinate(geometry.dimensions.margin.left + (geometry.dimensions.innerWidth / 2))}
            y={formatDecimalCoordinate(geometry.dimensions.outerHeight - 4)}
            textAnchor="middle"
          >
            Week
          </text>
          <text
            className="oil-lint-time-series-chart__axis-label"
            transform={`translate(10 ${formatDecimalCoordinate(geometry.dimensions.margin.top + (geometry.dimensions.innerHeight / 2))}) rotate(-90)`}
            textAnchor="middle"
          >
            {chartValueAxisLabel(viewModel.unitLabel)}
          </text>
        </g>
        <g clipPath={`url(#${plotClipPathId})`}>
          <TimeSeriesChartBaselineBand
            baselineBand={geometry.baselineBand}
            xStart={geometry.dimensions.margin.left}
            width={geometry.dimensions.innerWidth}
          />
          <TimeSeriesChartLinePath linePath={geometry.linePath} />
          <TimeSeriesChartCurrentMarker marker={geometry.currentMarker} />
        </g>
      </svg>

      <TimeSeriesChartCaveats caveats={viewModel.caveats} />
    </section>
  )
}
