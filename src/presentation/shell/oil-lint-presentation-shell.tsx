import React from 'react'

import { ifElse } from '@/shared/fp'
import { type Maybe, type Some } from '@/shared/maybe'

import { SummaryCardShell } from './summary-card-shell'
import type { SummaryDisplayState, SummaryViewModel } from '../contracts/summary-view-model'

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

const renderMaybeText = (value: Maybe<string>): string =>
  ifElse(
    (candidate: Maybe<string>): candidate is Some<string> => candidate.kind === 'Some',
    (candidate: Some<string>) => candidate.value,
    () => 'No additional state message.',
  )(value)

export function OilLintPresentationShell({ viewModel }: Readonly<{ readonly viewModel: SummaryViewModel }>) {
  return (
    <main className="oil-lint-shell" aria-labelledby="oil-lint-shell-title">
      <div className="oil-lint-shell__backdrop" aria-hidden="true" />

      <article className="oil-lint-shell__surface">
        <header className="oil-lint-shell__header">
          <p className="oil-lint-shell__eyebrow">Oil Lint</p>
          <h1 className="oil-lint-shell__title" id="oil-lint-shell-title">
            Weekly analysis presentation shell
          </h1>
          <p className="oil-lint-shell__lede">
            Temporary presentation-safe SummaryViewModel data is rendered here until route
            integration is wired up.
          </p>

          <dl className="oil-lint-shell__meta" aria-label="Display context">
            <div className="oil-lint-shell__meta-item">
              <dt className="oil-lint-shell__meta-label">Report week</dt>
              <dd className="oil-lint-shell__meta-value">{viewModel.reportWeekText}</dd>
            </div>
            <div className="oil-lint-shell__meta-item">
              <dt className="oil-lint-shell__meta-label">Geography</dt>
              <dd className="oil-lint-shell__meta-value">{viewModel.geographyText}</dd>
            </div>
          </dl>
        </header>

        <section className="oil-lint-shell__summary-region" aria-labelledby="oil-lint-summary-title">
          <ShellSectionHeader
            eyebrow="Weekly summary"
            title={viewModel.headline}
            titleId="oil-lint-summary-title"
            tag={summaryDisplayStateLabelByKind[viewModel.displayState]}
          />

          <div className="oil-lint-shell__summary-panel">
            <p className="oil-lint-shell__summary-label">Summary</p>
            <p className="oil-lint-shell__summary-text">{viewModel.summary}</p>

            <dl className="oil-lint-shell__summary-metrics" aria-label="Summary placeholders">
              <div className="oil-lint-shell__summary-metric">
                <dt className="oil-lint-shell__summary-metric-label">Condition</dt>
                <dd className="oil-lint-shell__summary-metric-value">{viewModel.conditionLabel}</dd>
              </div>
              <div className="oil-lint-shell__summary-metric">
                <dt className="oil-lint-shell__summary-metric-label">Confidence</dt>
                <dd className="oil-lint-shell__summary-metric-value">{viewModel.confidenceLabel}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="oil-lint-shell__cards-region" aria-labelledby="oil-lint-cards-title">
          <ShellSectionHeader
            eyebrow="Summary cards"
            title="Inventory and WTI price cards"
            titleId="oil-lint-cards-title"
            tag="SummaryCardViewModel"
          />

          <ul className="oil-lint-shell__card-grid">
            {viewModel.cards.map(card => (
              <SummaryCardShell key={card.kind} {...card} />
            ))}
          </ul>
        </section>

        <section className="oil-lint-shell__caveats-region" aria-labelledby="oil-lint-caveats-title">
          <ShellSectionHeader
            eyebrow="Caveats"
            title="Presentation caveats"
            titleId="oil-lint-caveats-title"
            tag="User trust display path"
          />

          <ul className="oil-lint-shell__caveat-list">
            {viewModel.caveats.map(caveat => (
              <li key={caveat.kind} className={`oil-lint-shell__caveat-item oil-lint-shell__caveat-item--${caveat.severity}`}>
                <p className="oil-lint-shell__caveat-title">{caveat.title}</p>
                <p className="oil-lint-shell__caveat-body">{caveat.message}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="oil-lint-shell__states-region" aria-labelledby="oil-lint-states-title">
          <ShellSectionHeader
            eyebrow="State"
            title="Display state"
            titleId="oil-lint-states-title"
            tag={summaryDisplayStateLabelByKind[viewModel.displayState]}
          />

          <div className="oil-lint-shell__state-grid">
            <section className={`oil-lint-shell__state oil-lint-shell__state--${viewModel.displayState}`}>
              <p className="oil-lint-shell__state-title">{summaryDisplayStateLabelByKind[viewModel.displayState]}</p>
              <p className="oil-lint-shell__state-body">{renderMaybeText(viewModel.displayStateMessage)}</p>
            </section>
          </div>
        </section>
      </article>
    </main>
  )
}