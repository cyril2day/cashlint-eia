import React from 'react'
import { matchMaybe, type Maybe } from '@/shared/maybe'

type SparklineCurrentMarkerProps = Readonly<{
  readonly marker: Maybe<Readonly<{ readonly x: number; readonly y: number }>>
}>

export function SparklineCurrentMarker({ marker }: SparklineCurrentMarkerProps) {
  return matchMaybe<Readonly<{ readonly x: number; readonly y: number }>, React.ReactNode>({
    Some: value => <circle className="oil-lint-sparkline__current-marker" cx={value.x} cy={value.y} r={2} />,
    None: () => null,
  })(marker)
}
