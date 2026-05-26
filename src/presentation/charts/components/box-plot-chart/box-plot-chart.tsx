import React from 'react'

import type { BoxPlotViewModel, FiveNumberSummaryViewModel } from '@/presentation/charts/contracts'
import { matchMaybe } from '@/shared/maybe'
import { formatDecimal, formatDecimalCoordinate } from '@/shared/decimal'
import { cond } from '@/shared/fp'
import {
  type ChartDomain,
  defaultChartSvgFrame,
  numericDomain,
  scaleXInFrame,
} from '@/shared/chart-svg'

const summaryRow = (label: string, value: number) => (
  <div className="box-plot-chart__row">
    <dt className="box-plot-chart__label">{label}</dt>
    <dd className="box-plot-chart__value">{formatDecimal(value)}</dd>
  </div>
)

const summaryValues = (summary: FiveNumberSummaryViewModel): readonly number[] => [
  summary.minimum,
  summary.firstQuartile,
  summary.median,
  summary.thirdQuartile,
  summary.maximum,
]

const boxPlotDomain = (
  summary: FiveNumberSummaryViewModel,
) => numericDomain(summaryValues(summary))

const boxPlotAxis = (
  summary: FiveNumberSummaryViewModel,
  domain: ChartDomain,
  xScale: (value: number) => number,
) => (
  <g className="box-plot-chart__axis-group">
    <line
      className="box-plot-chart__axis"
      x1={formatDecimalCoordinate(defaultChartSvgFrame.plotX)}
      x2={formatDecimalCoordinate(defaultChartSvgFrame.plotX + defaultChartSvgFrame.plotWidth)}
      y1={formatDecimalCoordinate(defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight)}
      y2={formatDecimalCoordinate(defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight)}
    />
    {[domain.minimum, summary.median, domain.maximum].map(value => (
      <g key={value} className="box-plot-chart__axis-tick">
        <line
          className="box-plot-chart__axis"
          x1={formatDecimalCoordinate(xScale(value))}
          x2={formatDecimalCoordinate(xScale(value))}
          y1={formatDecimalCoordinate(defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight)}
          y2={formatDecimalCoordinate(defaultChartSvgFrame.plotY + defaultChartSvgFrame.plotHeight + 5)}
        />
        <text
          className="box-plot-chart__axis-label"
          x={formatDecimalCoordinate(xScale(value))}
          y={formatDecimalCoordinate(defaultChartSvgFrame.height - 4)}
          textAnchor={boxPlotTickAnchor(value, domain)}
        >
          {formatDecimal(value)}
        </text>
      </g>
    ))}
  </g>
)

const boxPlotTickAnchor = (value: number, domain: ChartDomain): 'start' | 'middle' | 'end' =>
  cond<[number], 'start' | 'middle' | 'end'>([
    [candidate => candidate === domain.minimum, () => 'start'],
    [candidate => candidate === domain.maximum, () => 'end'],
    [() => true, () => 'middle'],
  ])(value)

const boxPlotSvg = (
  summary: FiveNumberSummaryViewModel,
  viewModel: BoxPlotViewModel,
) => {
  const domain = boxPlotDomain(summary)
  const xScale = scaleXInFrame(domain, defaultChartSvgFrame)
  const centerY = defaultChartSvgFrame.plotY + (defaultChartSvgFrame.plotHeight / 2)
  const boxY = centerY - 24
  const boxHeight = 48

  return (
    <svg
      className="box-plot-chart__svg"
      viewBox={`0 0 ${defaultChartSvgFrame.width} ${defaultChartSvgFrame.height}`}
      role="img"
      aria-label={viewModel.accessibilitySummary}
    >
      {boxPlotAxis(summary, domain, xScale)}
      <line
        className="box-plot-chart__whisker"
        x1={formatDecimalCoordinate(xScale(summary.minimum))}
        x2={formatDecimalCoordinate(xScale(summary.maximum))}
        y1={formatDecimalCoordinate(centerY)}
        y2={formatDecimalCoordinate(centerY)}
      />
      <line
        className="box-plot-chart__cap"
        x1={formatDecimalCoordinate(xScale(summary.minimum))}
        x2={formatDecimalCoordinate(xScale(summary.minimum))}
        y1={formatDecimalCoordinate(centerY - 20)}
        y2={formatDecimalCoordinate(centerY + 20)}
      />
      <line
        className="box-plot-chart__cap"
        x1={formatDecimalCoordinate(xScale(summary.maximum))}
        x2={formatDecimalCoordinate(xScale(summary.maximum))}
        y1={formatDecimalCoordinate(centerY - 20)}
        y2={formatDecimalCoordinate(centerY + 20)}
      />
      <rect
        className="box-plot-chart__box"
        x={formatDecimalCoordinate(xScale(summary.firstQuartile))}
        y={formatDecimalCoordinate(boxY)}
        width={formatDecimalCoordinate(xScale(summary.thirdQuartile) - xScale(summary.firstQuartile))}
        height={formatDecimalCoordinate(boxHeight)}
      />
      <line
        className="box-plot-chart__median"
        x1={formatDecimalCoordinate(xScale(summary.median))}
        x2={formatDecimalCoordinate(xScale(summary.median))}
        y1={formatDecimalCoordinate(boxY)}
        y2={formatDecimalCoordinate(boxY + boxHeight)}
      />
    </svg>
  )
}

const summaryView = (viewModel: BoxPlotViewModel) => (summary: FiveNumberSummaryViewModel) => (
  <div className="box-plot-chart__content">
    {boxPlotSvg(summary, viewModel)}
    <dl className="box-plot-chart__summary">
      {summaryRow('Minimum', summary.minimum)}
      {summaryRow('Q1', summary.firstQuartile)}
      {summaryRow('Median', summary.median)}
      {summaryRow('Q3', summary.thirdQuartile)}
      {summaryRow('Maximum', summary.maximum)}
    </dl>
  </div>
)

export function BoxPlotChart({ viewModel }: Readonly<{ readonly viewModel: BoxPlotViewModel }>) {
  return (
    <figure className="box-plot-chart" aria-label={viewModel.accessibilitySummary}>
      {matchMaybe<FiveNumberSummaryViewModel, React.ReactNode>({
        Some: summaryView(viewModel),
        None: () => <p className="box-plot-chart__empty">The range is still too thin for a fair box plot.</p>,
      })(viewModel.summary)}
    </figure>
  )
}
