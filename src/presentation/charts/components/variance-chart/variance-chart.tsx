import React from 'react'

import type { VarianceChartEntryViewModel, VarianceChartViewModel } from '../../contracts'
import { ifElse } from '@/shared/fp'
import { renderMaybeText } from '@/presentation/utils/render-maybe-text'

const entry = (item: VarianceChartEntryViewModel) => (
  <li key={item.category} className="variance-chart__entry">
    <p className="variance-chart__category">{item.category}</p>
    <dl className="variance-chart__values">
      <div className="variance-chart__value">
        <dt>Actual</dt>
        <dd>{item.actualValueLabel}</dd>
      </div>
      <div className="variance-chart__value">
        <dt>{item.reference.label}</dt>
        <dd>{item.reference.valueLabel}</dd>
      </div>
      <div className="variance-chart__value">
        <dt>Variance</dt>
        <dd>{item.varianceAmountLabel} · {renderMaybeText('No percentage')(item.variancePercentageLabel)}</dd>
      </div>
    </dl>
    <p className="variance-chart__direction">{item.directionLabel}</p>
  </li>
)

const entries = (viewModel: VarianceChartViewModel) =>
  ifElse(
    (candidate: VarianceChartViewModel) => candidate.entries.length > 0,
    candidate => <ul className="variance-chart__entries">{candidate.entries.map(entry)}</ul>,
    () => <p className="variance-chart__empty">No variance entries available.</p>,
  )(viewModel)

export function VarianceChart({ viewModel }: Readonly<{ readonly viewModel: VarianceChartViewModel }>) {
  return (
    <figure className="variance-chart" aria-label={viewModel.accessibilitySummary}>
      <p className="variance-chart__semantics">{viewModel.referenceSemantics}</p>
      {entries(viewModel)}
    </figure>
  )
}
