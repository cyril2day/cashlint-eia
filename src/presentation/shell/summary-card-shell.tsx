import React, { type ReactNode } from 'react'

import type { SummaryCardViewModel } from '@/presentation/contracts/summary-card-view-model'
import { renderMaybeText } from '@/presentation/utils/render-maybe-text'
import { matchMaybe, type Maybe } from '@/shared/maybe'

const summaryCardModifierByKind: Readonly<Record<SummaryCardViewModel['kind'], string>> = {
  inventory: 'oil-lint-shell__card--inventory',
  price: 'oil-lint-shell__card--price',
  system: 'oil-lint-shell__card--system',
}

type CardMetaEntry = Readonly<{
  readonly label: string
  readonly value: string
}>

const createCardMetaEntries = (card: SummaryCardViewModel): readonly CardMetaEntry[] => [
  { label: 'Trend', value: renderMaybeText('Not enough history')(card.trendLabel) },
  { label: 'Anomaly', value: renderMaybeText('No anomaly detected')(card.anomalyLabel) },
]

type SummaryCardShellProps = SummaryCardViewModel & Readonly<{
  readonly chart: Maybe<ReactNode>
}>

const renderCardChart = matchMaybe<ReactNode, ReactNode>({
  Some: chart => <div className="oil-lint-shell__card-chart">{chart}</div>,
  None: () => null,
})

export function SummaryCardShell({ kind, title, valueText, statusLabel, subtitleText, trendLabel, anomalyLabel, caveatLabel, drilldownTarget, chart }: SummaryCardShellProps) {
  const cardMetaEntries = createCardMetaEntries({
    kind,
    title,
    valueText,
    statusLabel,
    subtitleText,
    trendLabel,
    anomalyLabel,
    caveatLabel,
    drilldownTarget,
  })

  return (
    <li className={`oil-lint-shell__card ${summaryCardModifierByKind[kind]}`}>
      <div className="oil-lint-shell__card-head">
        <p className="oil-lint-shell__card-title">{title}</p>
        <span className="oil-lint-shell__card-status">{statusLabel}</span>
      </div>

      <p className="oil-lint-shell__card-value">{valueText}</p>

      <dl className="oil-lint-shell__card-meta" aria-label={`${title} card details`}>
        {cardMetaEntries.map(entry => (
          <div key={entry.label} className="oil-lint-shell__card-meta-item">
            <dt className="oil-lint-shell__card-meta-label">{entry.label}</dt>
            <dd className="oil-lint-shell__card-meta-value">{entry.value}</dd>
          </div>
        ))}
      </dl>

      {renderCardChart(chart)}
    </li>
  )
}
