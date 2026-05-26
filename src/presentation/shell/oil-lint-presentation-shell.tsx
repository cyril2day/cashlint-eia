import React from 'react'

import { ChartPanel } from '@/presentation/charts/components/chart-panel'
import { SummaryCardShell } from '@/presentation/shell/summary-card-shell'
import type { ChartPanelKind, ChartPanelViewModel, HomePageViewModel, SummaryCardKind, SummaryCardViewModel } from '@/presentation/contracts'
import { cond, ifElse } from '@/shared/fp'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'

const chartKindForCardKind = (kind: SummaryCardKind): ChartPanelKind =>
  cond<[SummaryCardKind], ChartPanelKind>([
    [candidate => candidate === 'inventory', () => 'AreaChart'],
    [candidate => candidate === 'price', () => 'TimeSeries'],
    [() => true, () => 'BarChart'],
  ])(kind)

const maybeChartPanel = (
  card: SummaryCardViewModel,
  panels: readonly ChartPanelViewModel[],
): Maybe<ChartPanelViewModel> => {
  const panel = panels.find(candidate => candidate.chartKind === chartKindForCardKind(card.kind))

  return ifElse(
    (candidate: ChartPanelViewModel | undefined): candidate is ChartPanelViewModel => candidate !== undefined,
    some,
    () => none(),
  )(panel)
}

const cardChart =
  (viewModel: HomePageViewModel) =>
  (card: SummaryCardViewModel): Maybe<React.ReactNode> =>
    matchMaybe<ChartPanelViewModel, Maybe<React.ReactNode>>({
      Some: panel => some(<ChartPanel viewModel={panel} controls={viewModel.chartsGallery.controls} />),
      None: () => none(),
    })(maybeChartPanel(card, viewModel.chartsGallery.panels))

export function OilLintPresentationShell({ viewModel }: Readonly<{ readonly viewModel: HomePageViewModel }>) {
  return (
    <div className="oil-lint-shell__workspace" aria-labelledby="oil-lint-shell-title">
      <header className="oil-lint-shell__header">
        <p className="oil-lint-shell__eyebrow">Oil Lint</p>
        <h1 className="oil-lint-shell__title" id="oil-lint-shell-title">
          The U.S. oil market, translated
        </h1>
        <p className="oil-lint-shell__lede">
          Every week, the U.S. government publishes oil storage, refinery, supply, and price data. This app reads it and tells you what it found.
        </p>

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
        {viewModel.summary.cards.map(card => (
          <SummaryCardShell
            key={card.kind}
            {...card}
            chart={cardChart(viewModel)(card)}
          />
        ))}
      </ul>
    </div>
  )
}
