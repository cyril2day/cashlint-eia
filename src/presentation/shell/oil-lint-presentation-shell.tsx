import React from 'react'

import { HomeMetricChart } from '@/presentation/shell/home-metric-chart'
import { SummaryCardShell } from '@/presentation/shell/summary-card-shell'
import type { DashboardMetricViewModel, HomeNavigationCardViewModel, HomePageViewModel, SummaryCardKind, SummaryCardViewModel } from '@/presentation/contracts'
import { cond } from '@/shared/fp'
import { none, some } from '@/shared/maybe'

const cardFromMetric = (metric: DashboardMetricViewModel): SummaryCardViewModel => ({
  kind: cond<[string], SummaryCardKind>([
    [candidate => candidate === 'inventory', () => 'inventory'],
    [candidate => candidate === 'price', () => 'price'],
    [candidate => candidate === 'availableSupply', () => 'availableSupply'],
    [candidate => candidate === 'refineryDemand', () => 'refineryDemand'],
    [() => true, () => 'system'],
  ])(metric.id),
  title: metric.title,
  valueText: metric.valueText,
  statusLabel: 'This week',
  subtitleText: metric.subtitleText,
  trendLabel: metric.changeText,
  anomalyLabel: none(),
  caveatLabel: none(),
  drilldownTarget: metric.href,
})

const metricCard = (metric: DashboardMetricViewModel): SummaryCardViewModel => cardFromMetric(metric)

const metricChart = (metric: DashboardMetricViewModel): React.ReactNode =>
  <HomeMetricChart viewModel={metric.chart} />

const renderNavigationCard = (card: HomeNavigationCardViewModel) => (
  <a key={card.href} className="oil-lint-shell__nav-card" href={card.href}>
    <span className="oil-lint-shell__nav-card-title">{card.title}</span>
    <span className="oil-lint-shell__nav-card-body">{card.body}</span>
    <span className="oil-lint-shell__nav-card-link">{card.linkLabel} &rarr;</span>
  </a>
)

const renderFooterNote = (note: string) => (
  <p key={note} className="oil-lint-shell__footer-note">{note}</p>
)

export function OilLintPresentationShell({ viewModel }: Readonly<{ readonly viewModel: HomePageViewModel }>) {
  return (
    <div className="oil-lint-shell__workspace" aria-labelledby="oil-lint-shell-title">
      <header className="oil-lint-shell__header">
        <p className="oil-lint-shell__eyebrow">{viewModel.hero.reportWeekLabel}</p>
        <h1 className="oil-lint-shell__title" id="oil-lint-shell-title">
          {viewModel.hero.headline}
        </h1>
        <p className="oil-lint-shell__lede">
          {viewModel.hero.summary}
        </p>
        <span className="oil-lint-shell__condition-badge">{viewModel.hero.conditionLabel}</span>

        <dl className="oil-lint-shell__meta" aria-label="Display context">
          <div className="oil-lint-shell__meta-item">
            <dt className="oil-lint-shell__meta-label">Report week</dt>
            <dd className="oil-lint-shell__meta-value">{viewModel.summary.reportWeekText}</dd>
          </div>
          <div className="oil-lint-shell__meta-item">
            <dt className="oil-lint-shell__meta-label">Geography</dt>
            <dd className="oil-lint-shell__meta-value">{viewModel.summary.geographyText}</dd>
          </div>
        </dl>
      </header>

      <ul className="oil-lint-shell__card-grid" aria-label="Inventory, price, and supply balance">
        {viewModel.metrics.map(metric => (
          <SummaryCardShell
            key={metric.id}
            {...metricCard(metric)}
            chart={some(metricChart(metric))}
          />
        ))}
      </ul>

      <section className="oil-lint-shell__balance-snapshot" aria-labelledby="oil-lint-balance-snapshot-title">
        <div>
          <p className="oil-lint-shell__section-eyebrow">Balance snapshot</p>
          <h2 className="oil-lint-shell__section-title" id="oil-lint-balance-snapshot-title">{viewModel.balanceSnapshot.title}</h2>
        </div>
        <dl className="oil-lint-shell__snapshot-rows">
          {viewModel.balanceSnapshot.rows.map(row => (
            <div key={row.id} className="oil-lint-shell__snapshot-row">
              <dt>{row.title}</dt>
              <dd>{row.valueText}</dd>
            </div>
          ))}
          <div className="oil-lint-shell__snapshot-row oil-lint-shell__snapshot-row--result">
            <dt>Result</dt>
            <dd>{viewModel.balanceSnapshot.resultLabel}</dd>
          </div>
        </dl>
        <a className="oil-lint-shell__inline-link" href={viewModel.balanceSnapshot.href}>{viewModel.balanceSnapshot.linkLabel} &rarr;</a>
      </section>

      <nav className="oil-lint-shell__nav-card-grid" aria-label="Deeper weekly views">
        {viewModel.navigationCards.map(renderNavigationCard)}
      </nav>

      <footer className="oil-lint-shell__footer-notes">
        {viewModel.footerNotes.map(renderFooterNote)}
      </footer>
    </div>
  )
}
