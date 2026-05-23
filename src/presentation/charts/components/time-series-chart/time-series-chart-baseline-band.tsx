import React from 'react'
import { matchMaybe, type Maybe } from '@/shared/maybe'

type BaselineBandProps = Readonly<{
  readonly baselineBand: Maybe<Readonly<{ readonly yTop: number; readonly yBottom: number }>>
  readonly xStart: number
  readonly width: number
}>

export function TimeSeriesChartBaselineBand({ baselineBand, xStart, width }: BaselineBandProps) {
  return matchMaybe<Readonly<{ readonly yTop: number; readonly yBottom: number }>, React.ReactNode>({
    Some: value => (
      <rect
        className="oil-lint-time-series-chart__baseline-band"
        x={xStart}
        y={value.yTop}
        width={width}
        height={value.yBottom - value.yTop}
      />
    ),
    None: () => null,
  })(baselineBand)
}
