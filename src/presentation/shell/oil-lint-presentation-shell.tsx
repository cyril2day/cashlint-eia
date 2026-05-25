import React from 'react'

import { ChartPanel } from '../charts/components/chart-panel'
import { SummaryCardShell } from './summary-card-shell'
import type { RichHomeViewModel, SummaryDisplayState } from '../contracts'
import { renderMaybeText } from '../utils/render-maybe-text'
import { ProductNavigation } from './product-navigation'
import { AnalysisControlPanel } from './analysis-control-panel'
import { HeroAnalysisPanel } from './hero-analysis-panel'
import { CaveatPanel } from './caveat-panel'
import { AnalysisTracePanel } from './analysis-trace-panel'

const summaryDisplayStateLabelByKind: Readonly<Record<SummaryDisplayState, string>> = {
  complete: 'Complete output',
  partial: 'Partial output',
  empty: 'Empty output',
  error: 'Error output',
}

type ShellSectionHeaderProps = Readonly<{
  readonly eyebrow: string
  readonly title: string
  readonly titleId: string
  readonly tag: string
}>

function ShellSectionHeader({ eyebrow, title, titleId, tag }: ShellSectionHeaderProps) {
  return (
    <div className="oil-lint-shell__section-head">
      <div>
        <p className="oil-lint-shell__section-eyebrow">{eyebrow}</p>
        <h2 className="oil-lint-shell__section-title" id={titleId}>
          {title}
        </h2>
      </div>
      <span className="oil-lint-shell__section-tag">{tag}</span>
    </div>
  )
}

export function OilLintPresentationShell({ viewModel }: Readonly<{ readonly viewModel: RichHomeViewModel }>) {
  return (
    <main className="oil-lint-shell" aria-labelledby="oil-lint-shell-title">
      <div className="oil-lint-shell__backdrop" aria-hidden="true" />

      <article className="oil-lint-shell__surface">
        <header className="oil-lint-shell__header">
          <ProductNavigation viewModel={viewModel.navigation} />
          <p className="oil-lint-shell__eyebrow">Oil Lint</p>
          <h1 className="oil-lint-shell__title" id="oil-lint-shell-title">
            Live petroleum intelligence workspace
          </h1>
          <p className="oil-lint-shell__lede">
            Real EIA data flows through the adapter, domain workflow, analysis synthesis, and rich presentation layer.
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

        <AnalysisControlPanel viewModel={viewModel.controls} />

        <HeroAnalysisPanel viewModel={viewModel.summary} />

        <section className="oil-lint-shell__summary-region" aria-labelledby="oil-lint-summary-title">
          <ShellSectionHeader
            eyebrow="Weekly summary"
            title={viewModel.summary.headline}
            titleId="oil-lint-summary-title"
            tag={summaryDisplayStateLabelByKind[viewModel.summary.displayState]}
          />

          <div className="oil-lint-shell__summary-panel">
            <p className="oil-lint-shell__summary-label">Summary</p>
            <p className="oil-lint-shell__summary-text">{viewModel.summary.summary}</p>

            <dl className="oil-lint-shell__summary-metrics" aria-label="Summary metrics">
              <div className="oil-lint-shell__summary-metric">
                <dt className="oil-lint-shell__summary-metric-label">Condition</dt>
                <dd className="oil-lint-shell__summary-metric-value">{viewModel.summary.conditionLabel}</dd>
              </div>
              <div className="oil-lint-shell__summary-metric">
                <dt className="oil-lint-shell__summary-metric-label">Confidence</dt>
                <dd className="oil-lint-shell__summary-metric-value">{viewModel.summary.confidenceLabel}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="oil-lint-shell__cards-region" aria-labelledby="oil-lint-cards-title">
          <ShellSectionHeader
            eyebrow="Summary cards"
            title="Live analysis cards"
            titleId="oil-lint-cards-title"
            tag="SummaryCardViewModel"
          />

          <ul className="oil-lint-shell__card-grid">
            {viewModel.summary.cards.map(card => (
              <SummaryCardShell key={card.kind} {...card} />
            ))}
          </ul>
        </section>

        <section className="oil-lint-shell__charts-region" aria-labelledby="oil-lint-charts-title">
          <ShellSectionHeader
            eyebrow="Chart preview"
            title="Visible visual analysis states"
            titleId="oil-lint-charts-title"
            tag="ChartPanelViewModel"
          />

          <div className="chart-gallery__grid">
            {viewModel.primaryCharts.map(panel => <ChartPanel key={panel.id} viewModel={panel} />)}
          </div>
        </section>

        <section className="oil-lint-shell__caveats-region" aria-labelledby="oil-lint-caveats-title">
          <CaveatPanel viewModel={viewModel.caveatPanel} />
        </section>

        <section className="oil-lint-shell__trace-region" aria-labelledby="oil-lint-trace-title">
          <AnalysisTracePanel viewModel={viewModel.tracePanel} />
        </section>

        <section className="oil-lint-shell__states-region" aria-labelledby="oil-lint-states-title">
          <ShellSectionHeader
            eyebrow="State"
            title="Display state"
            titleId="oil-lint-states-title"
            tag={viewModel.state}
          />

          <div className="oil-lint-shell__state-grid">
            <section className={`oil-lint-shell__state oil-lint-shell__state--${viewModel.summary.displayState}`}>
              <p className="oil-lint-shell__state-title">{summaryDisplayStateLabelByKind[viewModel.summary.displayState]}</p>
              <p className="oil-lint-shell__state-body">{renderMaybeText('No additional state message.')(viewModel.summary.displayStateMessage)}</p>
            </section>
          </div>
        </section>
      </article>
    </main>
  )
}
