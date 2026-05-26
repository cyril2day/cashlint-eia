import React from 'react'

import type { SparklineGeometry } from '@/presentation/charts/computation'
import type { SparklineWidgetInput } from '@/presentation/charts/widgets/sparkline/sparkline-widget'
import { SparklineLinePath } from '@/presentation/charts/components/sparkline/sparkline-line-path'
import { SparklineCurrentMarker } from '@/presentation/charts/components/sparkline/sparkline-current-marker'

type SparklineProps = Readonly<{
  readonly input: SparklineWidgetInput
  readonly geometry: SparklineGeometry
}>

export function Sparkline({ input, geometry }: SparklineProps) {
  return (
    <figure className="oil-lint-sparkline" aria-label={input.accessibilitySummary}>
      <svg
        className="oil-lint-sparkline__svg"
        width={geometry.dimensions.outerWidth}
        height={geometry.dimensions.outerHeight}
        viewBox={`0 0 ${geometry.dimensions.outerWidth} ${geometry.dimensions.outerHeight}`}
        role="img"
        aria-label={input.accessibilitySummary}
      >
        <SparklineLinePath linePath={geometry.linePath} />
        <SparklineCurrentMarker marker={geometry.currentMarker} />
      </svg>
      <figcaption className="oil-lint-sparkline__caption">{input.label}</figcaption>
    </figure>
  )
}
