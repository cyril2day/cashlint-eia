import React from 'react'

import type { MetricCardComparisonViewModel, MetricCardViewModel } from '../../contracts'
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

const statusBadge = (viewModel: MetricCardViewModel) =>
  matchMaybe<string, React.ReactNode>({
    Some: text => <span className="metric-card-chart__status">{text}</span>,
    None: () => null,
  })(viewModel.statusLabel)

const unitLabel = (viewModel: MetricCardViewModel) =>
  matchMaybe<string, React.ReactNode>({
    Some: text => <span className="metric-card-chart__unit">{text}</span>,
    None: () => null,
  })(viewModel.unitLabel)

const comparisonDelta = (comparison: MetricCardComparisonViewModel) =>
  matchMaybe<string, React.ReactNode>({
    Some: text => <span className="metric-card-chart__comparison-delta">{text}</span>,
    None: () => null,
  })(comparison.deltaLabel)

const comparison = (viewModel: MetricCardViewModel) =>
  matchMaybe<MetricCardComparisonViewModel, React.ReactNode>({
    Some: item => (
      <p className="metric-card-chart__comparison">
        <span className="metric-card-chart__comparison-label">{item.label}</span>
        <span className="metric-card-chart__comparison-value">{item.valueLabel}</span>
        {comparisonDelta(item)}
      </p>
    ),
    None: () => null,
  })(viewModel.comparison)

export function MetricCardChart({ viewModel }: Readonly<{ readonly viewModel: MetricCardViewModel }>) {
  return (
    <article className="metric-card-chart" aria-label={viewModel.accessibilitySummary}>
      <header className="metric-card-chart__header">
        <p className="metric-card-chart__title">{viewModel.title}</p>
        {statusBadge(viewModel)}
      </header>
      <div className="metric-card-chart__primary">
        <p className="metric-card-chart__value">{viewModel.valueLabel}</p>
        {unitLabel(viewModel)}
      </div>
      {comparison(viewModel)}
      <dl className="metric-card-chart__meta">
        {maybeItem('Trend', viewModel.trendLabel)}
      </dl>
    </article>
  )
}
