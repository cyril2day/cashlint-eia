import React from 'react'

import type { AreaChartPointViewModel, AreaChartViewModel } from '../../contracts'
import { ifElse } from '@/shared/fp'
import { renderMaybeText } from '@/presentation/utils/render-maybe-text'

const areaPoint = (point: AreaChartPointViewModel) => (
  <li key={point.reportWeekIso} className="area-chart__point">
    <span className="area-chart__point-week">{point.reportWeekIso}</span>
    <span className="area-chart__point-value">{renderMaybeText('Unavailable')(point.valueLabel)}</span>
  </li>
)

const points = (viewModel: AreaChartViewModel) =>
  ifElse(
    (candidate: AreaChartViewModel) => candidate.points.length > 0,
    candidate => <ul className="area-chart__points">{candidate.points.map(areaPoint)}</ul>,
    () => <p className="area-chart__empty">No area points available.</p>,
  )(viewModel)

export function AreaChart({ viewModel }: Readonly<{ readonly viewModel: AreaChartViewModel }>) {
  return (
    <figure className="area-chart" aria-label={viewModel.accessibilitySummary}>
      <div className="area-chart__shape" aria-hidden="true" />
      {points(viewModel)}
    </figure>
  )
}
