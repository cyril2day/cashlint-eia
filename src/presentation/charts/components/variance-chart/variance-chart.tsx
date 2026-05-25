import React from 'react'

import type { VarianceChartEntryViewModel, VarianceChartViewModel } from '../../contracts'
import { ifElse } from '@/shared/fp'
import { formatDecimal, formatDecimalCoordinate } from '@/shared/decimal'
import { renderMaybeText } from '@/presentation/utils/render-maybe-text'
import {
  type ChartDomain,
  defaultChartSvgFrame,
  paddedNumericDomain,
  scaleXInFrame,
} from '@/shared/chart-svg'

const barY = 42
const barHeight = 28
const referenceLabelY = 96
const actualLabelY = 18

const varianceDomain = (item: VarianceChartEntryViewModel) =>
  paddedNumericDomain([
    item.actualValue,
    item.reference.value,
    0,
  ])

const barX = (
  item: VarianceChartEntryViewModel,
  xScale: (value: number) => number,
): number =>
  Math.min(xScale(item.reference.value), xScale(item.actualValue))

const barWidth = (
  item: VarianceChartEntryViewModel,
  xScale: (value: number) => number,
): number =>
  Math.max(2, Math.abs(xScale(item.actualValue) - xScale(item.reference.value)))

const varianceTickValues = (domain: ChartDomain): readonly number[] =>
  Array.from(new Set([domain.minimum, 0, domain.maximum]))

const varianceTick =
  (xScale: (value: number) => number) =>
  (value: number) => (
    <g key={value} className="variance-chart__axis-tick">
      <line
        className="variance-chart__grid-line"
        x1={formatDecimalCoordinate(xScale(value))}
        x2={formatDecimalCoordinate(xScale(value))}
        y1="24"
        y2="86"
      />
      <text
        className="variance-chart__axis-label"
        x={formatDecimalCoordinate(xScale(value))}
        y="114"
        textAnchor="middle"
      >
        {formatDecimal(value)}
      </text>
    </g>
  )

const varianceAxis = (
  domain: ChartDomain,
  xScale: (value: number) => number,
) => (
  <g className="variance-chart__axis-group">
    {varianceTickValues(domain).map(varianceTick(xScale))}
    <line
      className="variance-chart__axis"
      x1={formatDecimalCoordinate(defaultChartSvgFrame.plotX)}
      x2={formatDecimalCoordinate(defaultChartSvgFrame.plotX + defaultChartSvgFrame.plotWidth)}
      y1={formatDecimalCoordinate(barY + (barHeight / 2))}
      y2={formatDecimalCoordinate(barY + (barHeight / 2))}
    />
  </g>
)

const entrySvg = (item: VarianceChartEntryViewModel) => {
  const domain = varianceDomain(item)
  const xScale = scaleXInFrame(domain, defaultChartSvgFrame)
  const referenceX = xScale(item.reference.value)
  const actualX = xScale(item.actualValue)

  return (
    <svg
      className="variance-chart__svg"
      viewBox={`0 0 ${defaultChartSvgFrame.width} 120`}
      role="img"
      aria-label={`${item.category}: ${item.directionLabel}`}
    >
      {varianceAxis(domain, xScale)}
      <line
        className="variance-chart__reference-line"
        x1={formatDecimalCoordinate(referenceX)}
        x2={formatDecimalCoordinate(referenceX)}
        y1="18"
        y2="86"
      />
      <rect
        className="variance-chart__bar"
        x={formatDecimalCoordinate(barX(item, xScale))}
        y={formatDecimalCoordinate(barY)}
        width={formatDecimalCoordinate(barWidth(item, xScale))}
        height={formatDecimalCoordinate(barHeight)}
      />
      <circle
        className="variance-chart__actual-marker"
        cx={formatDecimalCoordinate(actualX)}
        cy={formatDecimalCoordinate(barY + (barHeight / 2))}
        r="5"
      />
      <text className="variance-chart__reference-label" x={formatDecimalCoordinate(referenceX)} y={referenceLabelY}>
        {item.reference.label}
      </text>
      <text className="variance-chart__actual-label" x={formatDecimalCoordinate(actualX)} y={actualLabelY}>
        Actual
      </text>
    </svg>
  )
}

const entry = (item: VarianceChartEntryViewModel) => (
  <li key={item.category} className="variance-chart__entry">
    <p className="variance-chart__category">{item.category}</p>
    {entrySvg(item)}
    <dl className="variance-chart__values">
      <div className="variance-chart__value">
        <dt>Actual</dt>
        <dd>{item.actualValueLabel}</dd>
      </div>
      <div className="variance-chart__value">
        <dt>{item.reference.label}</dt>
        <dd>{item.reference.valueLabel}</dd>
      </div>
      <div className="variance-chart__value">
        <dt>Variance</dt>
        <dd>{item.varianceAmountLabel} · {renderMaybeText('No percentage')(item.variancePercentageLabel)}</dd>
      </div>
    </dl>
    <p className="variance-chart__direction">{item.directionLabel}</p>
  </li>
)

const entries = (viewModel: VarianceChartViewModel) =>
  ifElse(
    (candidate: VarianceChartViewModel) => candidate.entries.length > 0,
    candidate => <ul className="variance-chart__entries">{candidate.entries.map(entry)}</ul>,
    () => <p className="variance-chart__empty">No baseline reference yet, so no variance call here.</p>,
  )(viewModel)

export function VarianceChart({ viewModel }: Readonly<{ readonly viewModel: VarianceChartViewModel }>) {
  return (
    <figure className="variance-chart" aria-label={viewModel.accessibilitySummary}>
      <p className="variance-chart__semantics">{viewModel.referenceSemantics}</p>
      {entries(viewModel)}
    </figure>
  )
}
