import React from 'react'

import { oilLintPresentationDisplayLabels } from '@/presentation/display-policies'

import { SummaryCardShell } from './summary-card-shell'

type ShellCard = Readonly<{
  readonly kind: 'inventory' | 'price' | 'system'
  readonly title: string
  readonly value: string
  readonly note: string
}>

type ShellState = Readonly<{
  readonly kind: 'empty' | 'partial' | 'error'
  readonly title: string
  readonly body: string
}>

type ShellSectionHeaderProps = Readonly<{
  readonly eyebrow: string
  readonly title: string
  readonly titleId: string
  readonly tag: string
}>

const summaryMetrics: readonly ShellMetric[] = [
  {
    label: 'Condition',
    value: oilLintPresentationDisplayLabels.pendingCondition,
  },
  {
    label: 'Confidence',
    value: oilLintPresentationDisplayLabels.pendingConfidence,
  },
]

const summaryCards: readonly ShellCard[] = [
  {
    kind: 'inventory',
    title: 'Inventory',
    value: 'Waiting on SummaryViewModel',
    note: 'Physical storage signal will appear here in the next phase.',
  },
  {
    kind: 'price',
    title: 'WTI price',
    value: 'Waiting on SummaryViewModel',
    note: 'Market context will appear here in the next phase.',
  },
  {
    kind: 'system',
    title: 'System balance',
    value: 'Reserved for Phase 10',
    note: 'Full balance detail is not rendered yet.',
  },
] 

const shellStates: readonly ShellState[] = [
  {
    kind: 'empty',
    title: 'Empty state',
    body: 'This region will show an explicit empty state when no weekly analysis is available.',
  },
  {
    kind: 'partial',
    title: 'Partial state',
    body: 'This region will show partial but useful output when some mapped values are present.',
  },
  {
    kind: 'error',
    title: 'Error state',
    body: 'This region will show a safe display for future presentation errors and warnings.',
  },
] 

const shellMeta: readonly string[] = ['Report week', 'Geography']

type ShellMetric = Readonly<{
  readonly label: string
  readonly value: string
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

export function OilLintPresentationShell() {
  return (
    <main className="oil-lint-shell" aria-labelledby="oil-lint-shell-title">
      <div className="oil-lint-shell__backdrop" aria-hidden="true" />

      <article className="oil-lint-shell__surface">
        <header className="oil-lint-shell__header">
          <p className="oil-lint-shell__eyebrow">Oil Lint</p>
          <h1 className="oil-lint-shell__title" id="oil-lint-shell-title">
            Presentation shell for the weekly analysis experience
          </h1>
          <p className="oil-lint-shell__lede">
            This shell reserves the layout for future View Models. It keeps the presentation layer
            separate from domain meaning and uses placeholder content only.
          </p>

          <dl className="oil-lint-shell__meta" aria-label="Display context placeholders">
            {shellMeta.map(label => (
              <div key={label} className="oil-lint-shell__meta-item">
                <dt className="oil-lint-shell__meta-label">{label}</dt>
                <dd className="oil-lint-shell__meta-value">
                  {oilLintPresentationDisplayLabels.pendingSummaryValue}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <section className="oil-lint-shell__summary-region" aria-labelledby="oil-lint-summary-title">
          <ShellSectionHeader
            eyebrow="Weekly summary"
            title="Summary region placeholder"
            titleId="oil-lint-summary-title"
            tag="Placeholder only"
          />

          <div className="oil-lint-shell__summary-panel">
            <p className="oil-lint-shell__summary-label">Headline placeholder</p>
            <p className="oil-lint-shell__summary-text">
              Future headline and summary text will arrive here from SummaryViewModel.
            </p>

            <dl className="oil-lint-shell__summary-metrics" aria-label="Summary placeholders">
              {summaryMetrics.map(metric => (
                <div key={metric.label} className="oil-lint-shell__summary-metric">
                  <dt className="oil-lint-shell__summary-metric-label">{metric.label}</dt>
                  <dd className="oil-lint-shell__summary-metric-value">{metric.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="oil-lint-shell__cards-region" aria-labelledby="oil-lint-cards-title">
          <ShellSectionHeader
            eyebrow="Summary cards"
            title="Card grid shell"
            titleId="oil-lint-cards-title"
            tag="Inventory, price, system balance"
          />

          <ul className="oil-lint-shell__card-grid">
            {summaryCards.map(card => (
              <SummaryCardShell key={card.kind} {...card} />
            ))}
          </ul>
        </section>

        <section className="oil-lint-shell__caveats-region" aria-labelledby="oil-lint-caveats-title">
          <ShellSectionHeader
            eyebrow="Caveats"
            title="Caveat region shell"
            titleId="oil-lint-caveats-title"
            tag="User trust display path"
          />

          <ul className="oil-lint-shell__caveat-list">
            <li className="oil-lint-shell__caveat-item">
              Caveats will be mapped into this region from the presentation layer in a later phase.
            </li>
            <li className="oil-lint-shell__caveat-item">
              This placeholder keeps the location visible without inventing analysis meaning.
            </li>
          </ul>
        </section>

        <section className="oil-lint-shell__states-region" aria-labelledby="oil-lint-states-title">
          <ShellSectionHeader
            eyebrow="States"
            title="Error, empty, and partial states"
            titleId="oil-lint-states-title"
            tag="Accessible placeholders"
          />

          <div className="oil-lint-shell__state-grid">
            {shellStates.map(state => (
              <section key={state.kind} className={`oil-lint-shell__state oil-lint-shell__state--${state.kind}`}>
                <p className="oil-lint-shell__state-title">{state.title}</p>
                <p className="oil-lint-shell__state-body">{state.body}</p>
              </section>
            ))}
          </div>
        </section>
      </article>
    </main>
  )
}