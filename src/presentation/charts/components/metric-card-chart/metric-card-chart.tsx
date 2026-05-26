import React from 'react'

import type { MetricCardComparisonViewModel, MetricCardViewModel } from '@/presentation/charts/contracts'
import { matchMaybe } from '@/shared/maybe'
import { cond } from '@/shared/fp'

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

const trendDirectionClass = (trend: string): string =>
  cond<[string], string>([
    [candidate => candidate.toLowerCase().includes('up'), () => 'metric-card-chart__trend-icon--up'],
    [candidate => candidate.toLowerCase().includes('down'), () => 'metric-card-chart__trend-icon--down'],
    [() => true, () => 'metric-card-chart__trend-icon--flat'],
  ])(trend)

const trendIcon = (trend: string) => (
  <span className={`metric-card-chart__trend-icon ${trendDirectionClass(trend)}`} aria-hidden="true" />
)

const trendItem = (viewModel: MetricCardViewModel) =>
  matchMaybe<string, React.ReactNode>({
    Some: text => (
      <div className="metric-card-chart__meta-item">
        <p className="metric-card-chart__meta-value metric-card-chart__trend-value">
          {trendIcon(text)}
          <span>{text}</span>
        </p>
      </div>
    ),
    None: () => null,
  })(viewModel.trendLabel)

export function MetricCardChart({ viewModel }: Readonly<{ readonly viewModel: MetricCardViewModel }>) {
  return (
    <article className="metric-card-chart" aria-label={viewModel.accessibilitySummary}>
      <header className="metric-card-chart__header">
        {statusBadge(viewModel)}
      </header>
      <div className="metric-card-chart__primary">
        <p className="metric-card-chart__value">{viewModel.valueLabel}</p>
        {unitLabel(viewModel)}
      </div>
      {comparison(viewModel)}
      <div className="metric-card-chart__meta">
        {trendItem(viewModel)}
      </div>
    </article>
  )
}
