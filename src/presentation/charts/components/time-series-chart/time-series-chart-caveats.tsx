import React from 'react'
import type { ChartCaveatViewModel } from '../../contracts'

type CaveatsProps = Readonly<{
  readonly caveats: readonly ChartCaveatViewModel[]
}>

export function TimeSeriesChartCaveats({ caveats }: CaveatsProps) {
  return (
    <ul className="oil-lint-time-series-chart__caveats" aria-label="Chart caveats">
      {caveats.map(caveat => (
        <li key={`${caveat.kind}-${caveat.message}`} className="oil-lint-time-series-chart__caveat-item">
          <strong>{caveat.title}:</strong> {caveat.message}
        </li>
      ))}
    </ul>
  )
}
