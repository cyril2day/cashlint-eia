import React from 'react'

import type { HomeMetricChartViewModel } from '@/presentation/contracts'
import { renderHomeMetricChart } from '@/presentation/shell/home-metric-chart-renderers'

export function HomeMetricChart({ viewModel }: Readonly<{ readonly viewModel: HomeMetricChartViewModel }>) {
  return (
    <figure className={`home-metric-chart home-metric-chart--${viewModel.kind}`} aria-label={viewModel.summary}>
      <div className="home-metric-chart__frame" role="img" aria-label={viewModel.summary}>
        {renderHomeMetricChart(viewModel.points)(viewModel.kind)}
      </div>
    </figure>
  )
}
