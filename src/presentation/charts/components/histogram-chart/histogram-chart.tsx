import React from 'react'

import type { HistogramBinStrategy, HistogramMarkerViewModel, HistogramValueViewModel, HistogramViewModel } from '@/presentation/charts/contracts'
import { ifElse } from '@/shared/fp'
import { matchMaybe } from '@/shared/maybe'
import { formatDecimal, formatDecimalCoordinate } from '@/shared/decimal'
import {
  type ChartDomain,
  chartValueAxisLabel,
  defaultChartSvgFrame,
  numericDomain,
  scaleXInFrame,
} from '@/shared/chart-svg'

type HistogramBinView = Readonly<{
  readonly index: number
  readonly minimum: number
  readonly maximum: number
  readonly count: number
}>

type AutomaticHistogramBinStrategy = Extract<HistogramBinStrategy, { readonly kind: 'Automatic' }>
type ManualHistogramBinStrategy = Extract<HistogramBinStrategy, { readonly kind: 'ManualThresholds' }>

const isAutomaticBinStrategy = (strategy: HistogramBinStrategy): strategy is AutomaticHistogramBinStrategy =>
  strategy.kind === 'Automatic'

const requestedBinCount = (strategy: HistogramBinStrategy): number =>
  ifElse(
    isAutomaticBinStrategy,
    candidate => candidate.requestedBinCount,
    (candidate: ManualHistogramBinStrategy) => candidate.thresholds.length + 1,
  )(strategy)

const safeBinCount = (strategy: HistogramBinStrategy): number =>
  Math.max(1, requestedBinCount(strategy))

const binIndexForValue =
  (domain: ReturnType<typeof numericDomain>, binCount: number) =>
  (value: number): number => {
    const ratio = (value - domain.minimum) / (domain.maximum - domain.minimum)
    const rawIndex = Math.floor(ratio * binCount)

    return Math.min(binCount - 1, Math.max(0, rawIndex))
  }

const binCountAtIndex =
  (values: readonly HistogramValueViewModel[], domain: ReturnType<typeof numericDomain>, binCount: number) =>
  (index: number): number =>
    values.filter(value => binIndexForValue(domain, binCount)(value.value) === index).length

const binAtIndex =
  (values: readonly HistogramValueViewModel[], domain: ReturnType<typeof numericDomain>, binCount: number) =>
  (_: unknown, index: number): HistogramBinView => {
    const binWidth = (domain.maximum - domain.minimum) / binCount
    const minimum = domain.minimum + (binWidth * index)

    return {
      index,
      minimum,
      maximum: minimum + binWidth,
      count: binCountAtIndex(values, domain, binCount)(index),
    }
  }

const binsForViewModel = (viewModel: HistogramViewModel): readonly HistogramBinView[] => {
  const domain = numericDomain(viewModel.values.map(value => value.value))
  const binCount = safeBinCount(viewModel.binStrategy)

  return Array.from({ length: binCount }, binAtIndex(viewModel.values, domain, binCount))
}

const largestBinCount = (bins: readonly HistogramBinView[]): number =>
  Math.max(1, ...bins.map(bin => bin.count))

const countTickValues = (largest: number): readonly number[] =>
  Array.from(new Set([0, Math.ceil(largest / 2), largest]))

const binX =
  (domain: ReturnType<typeof numericDomain>) =>
  (bin: HistogramBinView): number =>
    scaleXInFrame(domain, defaultChartSvgFrame)(bin.minimum)

const binWidth =
  (domain: ReturnType<typeof numericDomain>) =>
  (bin: HistogramBinView): number =>
    Math.max(2, scaleXInFrame(domain, defaultChartSvgFrame)(bin.maximum) - binX(domain)(bin) - 4)

const binHeight =
  (largest: number) =>
  (bin: HistogramBinView): number =>
    (bin.count / largest) * defaultChartSvgFrame.plotHeight

const binY =
  (largest: number) =>
  (bin: HistogramBinView): number =>
    defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight - binHeight(largest)(bin)

const binLabel = (bin: HistogramBinView): string =>
  `${formatDecimal(bin.minimum)}-${formatDecimal(bin.maximum)}`

const countTickY =
  (largest: number) =>
  (value: number): number =>
    defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight - ((value / largest) * defaultChartSvgFrame.plotHeight)

const countTick =
  (largest: number) =>
  (value: number) => {
    const y = countTickY(largest)(value)

    return (
      <g key={value} className="histogram-chart__count-tick">
        <line
          className="histogram-chart__grid-line"
          x1={formatDecimalCoordinate(defaultChartSvgFrame.plotX)}
          x2={formatDecimalCoordinate(defaultChartSvgFrame.plotX + defaultChartSvgFrame.plotWidth)}
          y1={formatDecimalCoordinate(y)}
          y2={formatDecimalCoordinate(y)}
        />
        <text
          className="histogram-chart__axis-label"
          x={formatDecimalCoordinate(defaultChartSvgFrame.plotX - 6)}
          y={formatDecimalCoordinate(y + 4)}
          textAnchor="end"
        >
          {formatDecimal(value)}
        </text>
      </g>
    )
  }

const histogramAxes = (
  viewModel: HistogramViewModel,
  domain: ChartDomain,
  largest: number,
) => (
  <g className="histogram-chart__axes">
    {countTickValues(largest).map(countTick(largest))}
    <line
      className="histogram-chart__axis"
      x1={defaultChartSvgFrame.plotX}
      x2={defaultChartSvgFrame.plotX}
      y1={defaultChartSvgFrame.plotY}
      y2={defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight}
    />
    <line
      className="histogram-chart__axis"
      x1={defaultChartSvgFrame.plotX}
      x2={defaultChartSvgFrame.plotX + defaultChartSvgFrame.plotWidth}
      y1={defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight}
      y2={defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight}
    />
    <text
      className="histogram-chart__axis-label"
      x={formatDecimalCoordinate(defaultChartSvgFrame.plotX + (defaultChartSvgFrame.plotWidth / 2))}
      y={formatDecimalCoordinate(defaultChartSvgFrame.height - 2)}
      textAnchor="middle"
    >
      {chartValueAxisLabel(viewModel.unitLabel)}
    </text>
    <text
      className="histogram-chart__axis-label"
      transform={`translate(10 ${formatDecimalCoordinate(defaultChartSvgFrame.plotY + (defaultChartSvgFrame.plotHeight / 2))}) rotate(-90)`}
      textAnchor="middle"
    >
      Frequency
    </text>
    <text
      className="histogram-chart__axis-label"
      x={formatDecimalCoordinate(scaleXInFrame(domain, defaultChartSvgFrame)(domain.minimum))}
      y={formatDecimalCoordinate(defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight + 16)}
      textAnchor="start"
    >
      {formatDecimal(domain.minimum)}
    </text>
    <text
      className="histogram-chart__axis-label"
      x={formatDecimalCoordinate(scaleXInFrame(domain, defaultChartSvgFrame)(domain.maximum))}
      y={formatDecimalCoordinate(defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight + 16)}
      textAnchor="end"
    >
      {formatDecimal(domain.maximum)}
    </text>
  </g>
)

const bar =
  (domain: ReturnType<typeof numericDomain>, largest: number) =>
  (bin: HistogramBinView) => (
    <g key={bin.index} className="histogram-chart__bin">
      <rect
        className="histogram-chart__bar"
        x={formatDecimalCoordinate(binX(domain)(bin))}
        y={formatDecimalCoordinate(binY(largest)(bin))}
        width={formatDecimalCoordinate(binWidth(domain)(bin))}
        height={formatDecimalCoordinate(binHeight(largest)(bin))}
      />
      <text
        className="histogram-chart__axis-label"
        x={formatDecimalCoordinate(binX(domain)(bin))}
        y={formatDecimalCoordinate(defaultChartSvgFrame.height - 8)}
      >
        {binLabel(bin)}
      </text>
    </g>
  )

const currentMarker = (viewModel: HistogramViewModel): readonly HistogramMarkerViewModel[] =>
  matchMaybe<HistogramMarkerViewModel, readonly HistogramMarkerViewModel[]>({
    Some: marker => [marker],
    None: () => [],
  })(viewModel.currentMarker)

const markers = (viewModel: HistogramViewModel): readonly HistogramMarkerViewModel[] => [
  ...viewModel.referenceMarkers,
  ...currentMarker(viewModel),
]

const markerLine =
  (domain: ReturnType<typeof numericDomain>) =>
  (marker: HistogramMarkerViewModel) => {
    const x = scaleXInFrame(domain, defaultChartSvgFrame)(marker.value)

    return (
      <line
        key={marker.label}
        className="histogram-chart__marker"
        x1={formatDecimalCoordinate(x)}
        x2={formatDecimalCoordinate(x)}
        y1={formatDecimalCoordinate(defaultChartSvgFrame.plotY)}
        y2={formatDecimalCoordinate(defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight)}
      />
    )
  }

const histogramSvg = (viewModel: HistogramViewModel) => {
  const bins = binsForViewModel(viewModel)
  const domain = numericDomain([
    ...viewModel.values.map(value => value.value),
    ...markers(viewModel).map(marker => marker.value),
  ])
  const largest = largestBinCount(bins)

  return (
    <svg
      className="histogram-chart__svg"
      viewBox={`0 0 ${defaultChartSvgFrame.width} ${defaultChartSvgFrame.height}`}
      role="img"
      aria-label={viewModel.accessibilitySummary}
    >
      {histogramAxes(viewModel, domain, largest)}
      {bins.map(bar(domain, largest))}
      {markers(viewModel).map(markerLine(domain))}
    </svg>
  )
}

const histogram = (viewModel: HistogramViewModel) =>
  ifElse(
    (candidate: HistogramViewModel) => candidate.values.length > 0,
    histogramSvg,
    () => <p className="histogram-chart__empty">Not enough weekly values to sketch a distribution yet.</p>,
  )(viewModel)

export function HistogramChart({ viewModel }: Readonly<{ readonly viewModel: HistogramViewModel }>) {
  return (
    <figure className="histogram-chart" aria-label={viewModel.accessibilitySummary}>
      {histogram(viewModel)}
    </figure>
  )
}
