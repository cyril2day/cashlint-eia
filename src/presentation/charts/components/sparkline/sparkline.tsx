import React from 'react'

import type { SparklineViewModel } from '../../contracts'
import type { SparklineGeometry } from '../../computation'
import { SparklineLinePath } from './sparkline-line-path'
import { SparklineCurrentMarker } from './sparkline-current-marker'

type SparklineProps = Readonly<{
  readonly viewModel: SparklineViewModel
  readonly geometry: SparklineGeometry
}>

export function Sparkline({ viewModel, geometry }: SparklineProps) {
  return (
    <figure className="oil-lint-sparkline" aria-label={viewModel.accessibilitySummary}>
      <svg
        className="oil-lint-sparkline__svg"
        width={geometry.dimensions.outerWidth}
        height={geometry.dimensions.outerHeight}
        role="img"
        aria-label={viewModel.accessibilitySummary}
      >
        <SparklineLinePath linePath={geometry.linePath} />
        <SparklineCurrentMarker marker={geometry.currentMarker} />
      </svg>
      <figcaption className="oil-lint-sparkline__caption">{viewModel.label}</figcaption>
    </figure>
  )
}
