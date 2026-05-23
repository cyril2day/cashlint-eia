import React from 'react'
import { matchMaybe, type Maybe } from '@/shared/maybe'

type LinePathProps = Readonly<{
  readonly linePath: Maybe<string>
}>

export function TimeSeriesChartLinePath({ linePath }: LinePathProps) {
  return matchMaybe<string, React.ReactNode>({
    Some: value => <path className="oil-lint-time-series-chart__line" d={value} fill="none" />,
    None: () => null,
  })(linePath)
}
