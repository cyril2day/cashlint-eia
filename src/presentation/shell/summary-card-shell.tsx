import React from 'react'

import type { SummaryCardViewModel } from '../contracts/summary-card-view-model'
import { renderMaybeText } from '../utils/render-maybe-text'

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
  { label: 'Subtitle', value: renderMaybeText('Not in this run')(card.subtitleText) },
  { label: 'Trend', value: renderMaybeText('Not in this run')(card.trendLabel) },
  { label: 'Anomaly', value: renderMaybeText('No anomaly call yet')(card.anomalyLabel) },
  { label: 'Caveat', value: renderMaybeText('No caveat attached')(card.caveatLabel) },
  { label: 'Drilldown', value: renderMaybeText('No drilldown yet')(card.drilldownTarget) },
]

export function SummaryCardShell({ kind, title, valueText, statusLabel, subtitleText, trendLabel, anomalyLabel, caveatLabel, drilldownTarget }: SummaryCardViewModel) {
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
    </li>
  )
}
