import React from 'react'

import type { MetricCardViewModel } from '../../contracts'
import { matchMaybe } from '@/shared/maybe'

const maybeItem = (label: string, value: MetricCardViewModel['trendLabel']) =>
  matchMaybe<string, React.ReactNode>({
    Some: text => (
      <div className="metric-card-chart__meta-item">
        <dt className="metric-card-chart__meta-label">{label}</dt>
        <dd className="metric-card-chart__meta-value">{text}</dd>
      </div>
    ),
    None: () => null,
  })(value)

export function MetricCardChart({ viewModel }: Readonly<{ readonly viewModel: MetricCardViewModel }>) {
  return (
    <article className="metric-card-chart" aria-label={viewModel.accessibilitySummary}>
      <p className="metric-card-chart__title">{viewModel.title}</p>
      <p className="metric-card-chart__value">{viewModel.valueLabel}</p>
      <dl className="metric-card-chart__meta">
        {maybeItem('Unit', viewModel.unitLabel)}
        {maybeItem('Trend', viewModel.trendLabel)}
        {maybeItem('Status', viewModel.statusLabel)}
      </dl>
    </article>
  )
}
