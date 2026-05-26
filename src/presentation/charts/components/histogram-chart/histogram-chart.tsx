import React from 'react'

import type { HistogramWidgetBin, HistogramWidgetError, HistogramWidgetInput, HistogramWidgetMarker } from '@/presentation/charts/widgets/histogram/histogram-widget'
import { computeHistogramBins } from '@/presentation/charts/widgets/histogram/histogram-widget'
import { cond, ifElse } from '@/shared/fp'
import { isSuccess, type Result } from '@/shared/result'
import { formatDecimal, formatDecimalCoordinate } from '@/shared/decimal'
import {
  defaultChartSvgFrame,
  numericDomain,
  scaleXInFrame,
} from '@/shared/chart-svg'
import { ChartErrorMessage, type ChartErrorMessageViewModel } from '@/presentation/charts/components/chart-error-message'

const largestBinCount = (bins: readonly HistogramWidgetBin[]): number =>
  Math.max(1, ...bins.map(bin => bin.count))

const countTickValues = (largest: number): readonly number[] =>
  Array.from({ length: largest + 1 }, (_, index) => index)

const binX =
  (domain: ReturnType<typeof numericDomain>) =>
  (bin: HistogramWidgetBin): number =>
    scaleXInFrame(domain, defaultChartSvgFrame)(bin.minimum)

const binWidth =
  (domain: ReturnType<typeof numericDomain>) =>
  (bin: HistogramWidgetBin): number =>
    Math.max(2, scaleXInFrame(domain, defaultChartSvgFrame)(bin.maximum) - binX(domain)(bin))

const binCenterX =
  (domain: ReturnType<typeof numericDomain>) =>
  (bin: HistogramWidgetBin): number =>
    binX(domain)(bin) + (binWidth(domain)(bin) / 2)

const binHeight =
  (largest: number) =>
  (bin: HistogramWidgetBin): number =>
    (bin.count / largest) * defaultChartSvgFrame.plotHeight

const binY =
  (largest: number) =>
  (bin: HistogramWidgetBin): number =>
    defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight - binHeight(largest)(bin)

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

const isClosedBin = (bin: HistogramWidgetBin): boolean => bin.boundary === 'Closed'

const binRangeText = (bin: HistogramWidgetBin): string =>
  ifElse(
    isClosedBin,
    candidate => `[${formatDecimal(candidate.minimum)}, ${formatDecimal(candidate.maximum)}]`,
    candidate => `[${formatDecimal(candidate.minimum)}, ${formatDecimal(candidate.maximum)})`,
  )(bin)

const binAxisTick =
  (domain: ReturnType<typeof numericDomain>, rotateLabel: boolean) =>
  (bin: HistogramWidgetBin) => {
    const x = binCenterX(domain)(bin)
    const y = defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight

    const rotatedLabel = (_candidate: HistogramWidgetBin) => (
      <g key={bin.index} className="histogram-chart__bin-axis-tick">
        <line
          className="histogram-chart__axis-tick"
          x1={formatDecimalCoordinate(x)}
          x2={formatDecimalCoordinate(x)}
          y1={formatDecimalCoordinate(y)}
          y2={formatDecimalCoordinate(y + 5)}
        />
        <text
          className="histogram-chart__axis-label histogram-chart__bin-axis-label"
          x={formatDecimalCoordinate(x)}
          y={formatDecimalCoordinate(y + 18)}
          textAnchor="end"
          transform={`rotate(-32 ${formatDecimalCoordinate(x)} ${formatDecimalCoordinate(y + 18)})`}
        >
          {binRangeText(bin)}
        </text>
      </g>
    )

    const straightLabel = (_candidate: HistogramWidgetBin) => (
      <g key={bin.index} className="histogram-chart__bin-axis-tick">
        <line
          className="histogram-chart__axis-tick"
          x1={formatDecimalCoordinate(x)}
          x2={formatDecimalCoordinate(x)}
          y1={formatDecimalCoordinate(y)}
          y2={formatDecimalCoordinate(y + 5)}
        />
        <text
          className="histogram-chart__axis-label histogram-chart__bin-axis-label"
          x={formatDecimalCoordinate(x)}
          y={formatDecimalCoordinate(y + 18)}
          textAnchor="middle"
        >
          {binRangeText(bin)}
        </text>
      </g>
    )

    return ifElse(
      (candidate: boolean) => candidate,
      () => rotatedLabel(bin),
      () => straightLabel(bin),
    )(rotateLabel)
  }

const shouldRotateBinLabels = (bins: readonly HistogramWidgetBin[]): boolean =>
  bins.length > 4

const histogramAxes = (
  bins: readonly HistogramWidgetBin[],
  domain: ReturnType<typeof numericDomain>,
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
    {bins.map(binAxisTick(domain, shouldRotateBinLabels(bins)))}
  </g>
)

const bar =
  (domain: ReturnType<typeof numericDomain>, largest: number) =>
  (bin: HistogramWidgetBin) => (
    <g key={bin.index} className="histogram-chart__bin">
      <rect
        className="histogram-chart__bar"
        x={formatDecimalCoordinate(binX(domain)(bin))}
        y={formatDecimalCoordinate(binY(largest)(bin))}
        width={formatDecimalCoordinate(binWidth(domain)(bin))}
        height={formatDecimalCoordinate(binHeight(largest)(bin))}
      />
      <title>{`${binRangeText(bin)}: ${formatDecimal(bin.count)}`}</title>
    </g>
  )

const markerLine =
  (domain: ReturnType<typeof numericDomain>) =>
  (marker: HistogramWidgetMarker) => {
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

const domainValues = (
  input: HistogramWidgetInput,
  bins: readonly HistogramWidgetBin[],
): readonly number[] => [
  ...bins.map(bin => bin.minimum),
  ...bins.map(bin => bin.maximum),
  ...input.markers.map(marker => marker.value),
]

const histogramSvg = (
  input: HistogramWidgetInput,
  bins: readonly HistogramWidgetBin[],
) => {
  const domain = numericDomain([
    ...input.values,
    ...domainValues(input, bins),
  ])
  const largest = largestBinCount(bins)

  return (
    <svg
      className="histogram-chart__svg"
      viewBox={`0 0 ${defaultChartSvgFrame.width} ${defaultChartSvgFrame.height}`}
      role="img"
      aria-label={input.accessibilitySummary}
    >
      {histogramAxes(bins, domain, largest)}
      {bins.map(bar(domain, largest))}
      {input.markers.map(markerLine(domain))}
    </svg>
  )
}

const histogramErrorMessage = (error: HistogramWidgetError): string =>
  cond<[HistogramWidgetError], string>([
    [candidate => candidate.kind === 'EmptyDataset', () => 'Not enough values to compute a histogram yet.'],
    [candidate => candidate.kind === 'NonNumericValue', () => 'Histogram values must be finite numbers.'],
    [candidate => candidate.kind === 'InvalidBinCount', () => 'Histogram bin count must be a positive integer.'],
    [candidate => candidate.kind === 'InvalidBinBoundaries', () => 'Histogram bin boundaries must be finite and strictly ascending.'],
    [candidate => candidate.kind === 'BoundariesOutsideDatasetRange', () => 'Histogram bin boundaries must cover the dataset range.'],
    [() => true, () => 'Histogram input could not be rendered.'],
  ])(error)
const histogramError = (error: HistogramWidgetError): ChartErrorMessageViewModel => ({
  title: 'Histogram input could not be rendered',
  message: histogramErrorMessage(error),
})

const histogramFromResult =
  (input: HistogramWidgetInput) =>
  (result: Result<readonly HistogramWidgetBin[], HistogramWidgetError>) =>
    ifElse(
      isSuccess<readonly HistogramWidgetBin[], HistogramWidgetError>,
      value => histogramSvg(input, value.value),
      value => <ChartErrorMessage error={histogramError(value.error)} />,
    )(result)

const histogram = (input: HistogramWidgetInput) =>
  ifElse(
    (candidate: HistogramWidgetInput) => candidate.values.length > 0,
    candidate => histogramFromResult(candidate)(computeHistogramBins(candidate)),
    () => <ChartErrorMessage error={histogramError({ kind: 'EmptyDataset' })} />,
  )(input)

export function HistogramChart({ input }: Readonly<{ readonly input: HistogramWidgetInput }>) {
  return (
    <figure className="histogram-chart" aria-label={input.accessibilitySummary}>
      {histogram(input)}
    </figure>
  )
}
