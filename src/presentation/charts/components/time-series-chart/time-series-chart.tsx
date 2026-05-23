import React from 'react'

import type { TimeSeriesChartViewModel } from '../../contracts'
import type { TimeSeriesChartGeometry } from '../../computation'
import { TimeSeriesChartBaselineBand } from './time-series-chart-baseline-band'
import { TimeSeriesChartLinePath } from './time-series-chart-line-path'
import { TimeSeriesChartCurrentMarker } from './time-series-chart-current-marker'
import { TimeSeriesChartCaveats } from './time-series-chart-caveats'

type TimeSeriesChartProps = Readonly<{
  readonly viewModel: TimeSeriesChartViewModel
  readonly geometry: TimeSeriesChartGeometry
}>

export function TimeSeriesChart({ viewModel, geometry }: TimeSeriesChartProps) {
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
        <TimeSeriesChartBaselineBand
          baselineBand={geometry.baselineBand}
          xStart={geometry.dimensions.margin.left}
          width={geometry.dimensions.innerWidth}
        />
        <TimeSeriesChartLinePath linePath={geometry.linePath} />
        <TimeSeriesChartCurrentMarker marker={geometry.currentMarker} />
      </svg>

      <TimeSeriesChartCaveats caveats={viewModel.caveats} />
    </section>
  )
}
