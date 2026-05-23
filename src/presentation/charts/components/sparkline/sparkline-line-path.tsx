import React from 'react'
import { matchMaybe, type Maybe } from '@/shared/maybe'

type SparklineLinePathProps = Readonly<{
  readonly linePath: Maybe<string>
}>

export function SparklineLinePath({ linePath }: SparklineLinePathProps) {
  return matchMaybe<string, React.ReactNode>({
    Some: value => <path className="oil-lint-sparkline__line" d={value} fill="none" />,
    None: () => null,
  })(linePath)
}
