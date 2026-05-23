import React from 'react'

import { ifElse } from '@/shared/fp'
import { type Maybe, type Some } from '@/shared/maybe'

import type { SummaryCardViewModel } from '../contracts/summary-card-view-model'

const summaryCardModifierByKind: Readonly<Record<SummaryCardViewModel['kind'], string>> = {
  inventory: 'oil-lint-shell__card--inventory',
  price: 'oil-lint-shell__card--price',
  system: 'oil-lint-shell__card--system',
}

type CardMetaEntry = Readonly<{
  readonly label: string
  readonly value: string
}>

const renderMaybeText = (value: Maybe<string>): string =>
  ifElse(
    (candidate: Maybe<string>): candidate is Some<string> => candidate.kind === 'Some',
    (candidate: Some<string>) => candidate.value,
    () => 'Unavailable',
  )(value)

const createCardMetaEntries = (card: SummaryCardViewModel): readonly CardMetaEntry[] => [
  { label: 'Subtitle', value: renderMaybeText(card.subtitleText) },
  { label: 'Trend', value: renderMaybeText(card.trendLabel) },
  { label: 'Anomaly', value: renderMaybeText(card.anomalyLabel) },
  { label: 'Caveat', value: renderMaybeText(card.caveatLabel) },
  { label: 'Drilldown', value: renderMaybeText(card.drilldownTarget) },
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