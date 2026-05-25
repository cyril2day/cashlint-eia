import React from 'react'

import type { HistogramValueViewModel, HistogramViewModel } from '../../contracts'
import { ifElse } from '@/shared/fp'

const largestValue = (values: readonly HistogramValueViewModel[]): number =>
  Math.max(1, ...values.map(value => Math.abs(value.value)))

const columnHeight = (largest: number) => (value: HistogramValueViewModel): string =>
  `${String((Math.abs(value.value) / largest) * 100)}%`

const column = (largest: number) => (value: HistogramValueViewModel) => (
  <li key={value.label} className="histogram-chart__column">
    <span className="histogram-chart__bar" style={{ blockSize: columnHeight(largest)(value) }} aria-hidden="true" />
    <span className="histogram-chart__label">{value.label}</span>
  </li>
)

const columns = (viewModel: HistogramViewModel) =>
  ifElse(
    (candidate: HistogramViewModel) => candidate.values.length > 0,
    candidate => <ul className="histogram-chart__columns">{candidate.values.map(column(largestValue(candidate.values)))}</ul>,
    () => <p className="histogram-chart__empty">No distribution values available.</p>,
  )(viewModel)

export function HistogramChart({ viewModel }: Readonly<{ readonly viewModel: HistogramViewModel }>) {
  return (
    <figure className="histogram-chart" aria-label={viewModel.accessibilitySummary}>
      {columns(viewModel)}
    </figure>
  )
}
