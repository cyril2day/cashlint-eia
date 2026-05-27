import React, { type ReactNode } from 'react'

import type { SummaryCardViewModel } from '@/presentation/contracts/summary-card-view-model'
import { renderMaybeText } from '@/presentation/utils/render-maybe-text'
import { matchMaybe, type Maybe } from '@/shared/maybe'

const summaryCardModifierByKind: Readonly<Record<SummaryCardViewModel['kind'], string>> = {
  inventory: 'oil-lint-shell__card--inventory',
  price: 'oil-lint-shell__card--price',
  availableSupply: 'oil-lint-shell__card--supply',
  refineryDemand: 'oil-lint-shell__card--refinery',
  system: 'oil-lint-shell__card--system',
}

type CardMetaEntry = Readonly<{
  readonly label: string
  readonly value: string
}>

const createCardMetaEntries = (card: SummaryCardViewModel): readonly CardMetaEntry[] => [
  { label: 'This week', value: renderMaybeText('No weekly change available')(card.trendLabel) },
  { label: 'About', value: renderMaybeText('No description supplied')(card.subtitleText) },
]

type SummaryCardShellProps = SummaryCardViewModel & Readonly<{
  readonly chart: Maybe<ReactNode>
}>

const renderCardChart = matchMaybe<ReactNode, ReactNode>({
  Some: chart => <div className="oil-lint-shell__card-chart">{chart}</div>,
  None: () => null,
})

const cardChartModifier = matchMaybe<ReactNode, string>({
  Some: () => ' oil-lint-shell__card--with-chart',
  None: () => '',
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
    <li className={`oil-lint-shell__card ${summaryCardModifierByKind[kind]}${cardChartModifier(chart)}`}>
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
