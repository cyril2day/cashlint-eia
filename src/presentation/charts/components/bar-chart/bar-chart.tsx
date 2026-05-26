import React from 'react'

import type { BarChartPointViewModel, BarChartViewModel } from '@/presentation/charts/contracts'
import { formatDecimalCssPercent } from '@/shared/decimal'
import { cond, ifElse } from '@/shared/fp'

const absoluteValue = (value: number): number => Math.abs(value)

const largestMagnitude = (points: readonly BarChartPointViewModel[]): number =>
  Math.max(1, ...points.map(point => absoluteValue(point.value)))

const barWidth = (largest: number) => (point: BarChartPointViewModel): string =>
  formatDecimalCssPercent((absoluteValue(point.value) / largest) * 100)

const directionLabel = (point: BarChartPointViewModel): string =>
  cond<[BarChartPointViewModel], string>([
    [candidate => candidate.direction === 'Positive', () => 'Increase'],
    [candidate => candidate.direction === 'Negative', () => 'Decrease'],
    [() => true, () => 'Flat'],
  ])(point)

const barItem = (largest: number) => (point: BarChartPointViewModel) => (
  <li key={point.category} className={`bar-chart__item bar-chart__item--${point.direction}`}>
    <div className="bar-chart__label-row">
      <span className="bar-chart__category">{point.category}</span>
      <span className="bar-chart__value">
        <span className={`bar-chart__direction bar-chart__direction--${point.direction}`}>{directionLabel(point)}</span>
        {point.valueLabel}
      </span>
    </div>
    <div className="bar-chart__track" aria-hidden="true">
      <span className="bar-chart__bar" style={{ inlineSize: barWidth(largest)(point) }} />
    </div>
  </li>
)

const barList = (viewModel: BarChartViewModel) =>
  ifElse(
    (candidate: BarChartViewModel) => candidate.points.length > 0,
    candidate => <ul className="bar-chart__list">{candidate.points.map(barItem(largestMagnitude(candidate.points)))}</ul>,
    () => <p className="bar-chart__empty">No driver bars to show for this run.</p>,
  )(viewModel)

export function BarChart({ viewModel }: Readonly<{ readonly viewModel: BarChartViewModel }>) {
  return (
    <figure className="bar-chart" aria-label={viewModel.accessibilitySummary}>
      {barList(viewModel)}
    </figure>
  )
}
