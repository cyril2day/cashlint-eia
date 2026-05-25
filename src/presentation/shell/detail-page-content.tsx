import React from 'react'

import { ChartPanel } from '@/presentation/charts/components/chart-panel'
import type { DetailPageViewModel } from '@/presentation/contracts'
import { DetailPageShell } from '@/presentation/shell/detail-page-shell'
import { DetailRowList } from '@/presentation/shell/detail-row-list'
import { SummaryCardShell } from '@/presentation/shell/summary-card-shell'

export function DetailPageContent({ viewModel }: Readonly<{ readonly viewModel: DetailPageViewModel }>) {
  return (
    <DetailPageShell viewModel={viewModel}>
      <section className="detail-page__section" aria-label="Detail cards">
        <ul className="oil-lint-shell__card-grid">
          {viewModel.cards.map(card => <SummaryCardShell key={card.kind} {...card} />)}
        </ul>
      </section>
      <section className="detail-page__section" aria-label="Detail facts">
        <DetailRowList rows={viewModel.rows} />
      </section>
      <section className="detail-page__section" aria-label="Detail charts">
        <div className="chart-gallery__grid">
          {viewModel.charts.map(panel => <ChartPanel key={panel.id} viewModel={panel} />)}
        </div>
      </section>
    </DetailPageShell>
  )
}
