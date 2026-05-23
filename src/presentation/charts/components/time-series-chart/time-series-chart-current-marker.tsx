import React from 'react'
import { matchMaybe, type Maybe } from '@/shared/maybe'

type CurrentMarkerProps = Readonly<{
  readonly marker: Maybe<Readonly<{ readonly x: number; readonly y: number }>>
}>

export function TimeSeriesChartCurrentMarker({ marker }: CurrentMarkerProps) {
  return matchMaybe<Readonly<{ readonly x: number; readonly y: number }>, React.ReactNode>({
    Some: value => <circle className="oil-lint-time-series-chart__current-marker" cx={value.x} cy={value.y} r={4} />,
    None: () => null,
  })(marker)
}
