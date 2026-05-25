import React from 'react'

import type { BoxPlotMarkerViewModel, BoxPlotViewModel, FiveNumberSummaryViewModel } from '../../contracts'
import { matchMaybe } from '@/shared/maybe'

const summaryRow = (label: string, value: number) => (
  <div className="box-plot-chart__row">
    <dt className="box-plot-chart__label">{label}</dt>
    <dd className="box-plot-chart__value">{String(value)}</dd>
  </div>
)

const marker = (item: BoxPlotMarkerViewModel) => (
  <li key={item.label} className="box-plot-chart__marker">{item.label}: {String(item.value)}</li>
)

const summaryView = (summary: FiveNumberSummaryViewModel) => (
  <dl className="box-plot-chart__summary">
    {summaryRow('Minimum', summary.minimum)}
    {summaryRow('Q1', summary.firstQuartile)}
    {summaryRow('Median', summary.median)}
    {summaryRow('Q3', summary.thirdQuartile)}
    {summaryRow('Maximum', summary.maximum)}
  </dl>
)

export function BoxPlotChart({ viewModel }: Readonly<{ readonly viewModel: BoxPlotViewModel }>) {
  return (
    <figure className="box-plot-chart" aria-label={viewModel.accessibilitySummary}>
      {matchMaybe<FiveNumberSummaryViewModel, React.ReactNode>({
        Some: summaryView,
        None: () => <p className="box-plot-chart__empty">No five-number summary available.</p>,
      })(viewModel.summary)}
      <ul className="box-plot-chart__markers">{viewModel.referenceMarkers.map(marker)}</ul>
    </figure>
  )
}
