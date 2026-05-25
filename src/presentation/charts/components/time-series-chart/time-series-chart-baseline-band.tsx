import React from 'react'
import { matchMaybe, type Maybe } from '@/shared/maybe'

type BaselineBandProps = Readonly<{
  readonly baselineBand: Maybe<Readonly<{ readonly yTop: number; readonly yBottom: number }>>
  readonly xStart: number
  readonly width: number
}>

const bandY = (value: Readonly<{ readonly yTop: number; readonly yBottom: number }>): number =>
  Math.min(value.yTop, value.yBottom)

const bandHeight = (value: Readonly<{ readonly yTop: number; readonly yBottom: number }>): number =>
  Math.abs(value.yBottom - value.yTop)

export function TimeSeriesChartBaselineBand({ baselineBand, xStart, width }: BaselineBandProps) {
  return matchMaybe<Readonly<{ readonly yTop: number; readonly yBottom: number }>, React.ReactNode>({
    Some: value => (
      <rect
        className="oil-lint-time-series-chart__baseline-band"
        x={xStart}
        y={bandY(value)}
        width={width}
        height={bandHeight(value)}
      />
    ),
    None: () => null,
  })(baselineBand)
}
