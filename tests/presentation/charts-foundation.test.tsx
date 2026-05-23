import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  Sparkline,
  TimeSeriesChart,
  composeSparklineGeometry,
  composeTimeSeriesChartGeometry,
  createChartDimensions,
  mapContextualizedSignalToSparkline,
  mapContextualizedSignalToTimeSeriesChart,
} from '@/presentation'
import {
  createContextualizedSignal,
  createNotComputedAnomalyState,
  createNotComputedBaselineResult,
  createPriceSignal,
  createPriceSignalIdentity,
} from '@/contexts/interpretation'
import {
  parseGeographyScope,
  parseMeasurementKind,
  parseMeasurementUnit,
  parsePetroleumSlice,
  parsePriceKind,
  parseReportWeek,
} from '@/contexts/measurement/model'
import { ifElse } from '@/shared/fp'
import { isSuccess, type Result } from '@/shared/result'
import { none } from '@/shared/maybe'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    isSuccess,
    candidate => candidate.value,
    () => {
      throw new Error('expected success')
    },
  )(result)

const geography = unwrapSuccess(parseGeographyScope('USTotal'))
const measurementKind = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
const slice = unwrapSuccess(parsePetroleumSlice('Price'))
const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
const unit = unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))

const identity = createPriceSignalIdentity(geography, measurementKind, slice, priceKind)

const signal = createPriceSignal(
  identity,
  unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z')),
  geography,
  72,
  unit,
  slice,
)

const contextualizedSignal = createContextualizedSignal(
  signal,
  none(),
  createNotComputedBaselineResult('history unavailable'),
  createNotComputedAnomalyState('insufficient baseline history'),
  [],
)

const historicalPoints = [
  {
    reportWeek: unwrapSuccess(parseReportWeek('2026-05-05T00:00:00.000Z')),
    value: 68,
  },
  {
    reportWeek: unwrapSuccess(parseReportWeek('2026-05-12T00:00:00.000Z')),
    value: 70,
  },
  {
    reportWeek: unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z')),
    value: 72,
  },
]

describe('Presentation chart foundation', () => {
  it('maps contextualized signal to time-series and sparkline view models', () => {
    const timeSeries = mapContextualizedSignalToTimeSeriesChart({
      id: 'wti-time-series',
      title: 'WTI weekly history',
      subtitle: none(),
      signal: contextualizedSignal,
      historicalPoints,
    })

    const sparkline = mapContextualizedSignalToSparkline({
      id: 'wti-sparkline',
      label: 'WTI short trend',
      signal: contextualizedSignal,
      historicalPoints,
    })

    expect(timeSeries.points).toHaveLength(3)
    expect(timeSeries.displayState).toBe('Complete')
    expect('sourceSignal' in timeSeries).toBe(false)
    expect(sparkline.points).toHaveLength(3)
    expect(sparkline.displayState).toBe('Complete')
    expect('sourceSignal' in sparkline).toBe(false)
  })

  it('computes line and sparkline geometry using explicit dimensions', () => {
    const dimensions = unwrapSuccess(createChartDimensions(480, 220))

    const timeSeries = mapContextualizedSignalToTimeSeriesChart({
      id: 'wti-time-series',
      title: 'WTI weekly history',
      subtitle: none(),
      signal: contextualizedSignal,
      historicalPoints,
    })

    const sparkline = mapContextualizedSignalToSparkline({
      id: 'wti-sparkline',
      label: 'WTI short trend',
      signal: contextualizedSignal,
      historicalPoints,
    })

    const lineGeometry = composeTimeSeriesChartGeometry(timeSeries, dimensions)
    const sparklineGeometry = composeSparklineGeometry(sparkline, dimensions)

    expect(lineGeometry.linePath.kind).toBe('Some')
    expect(lineGeometry.xTicks.length).toBeGreaterThan(0)
    expect(sparklineGeometry.linePath.kind).toBe('Some')
  })

  it('renders modular chart components without DOM mutation', () => {
    const dimensions = unwrapSuccess(createChartDimensions(480, 220))

    const timeSeries = mapContextualizedSignalToTimeSeriesChart({
      id: 'wti-time-series',
      title: 'WTI weekly history',
      subtitle: none(),
      signal: contextualizedSignal,
      historicalPoints,
    })

    const sparkline = mapContextualizedSignalToSparkline({
      id: 'wti-sparkline',
      label: 'WTI short trend',
      signal: contextualizedSignal,
      historicalPoints,
    })

    const lineMarkup = renderToStaticMarkup(
      <TimeSeriesChart viewModel={timeSeries} geometry={composeTimeSeriesChartGeometry(timeSeries, dimensions)} />,
    )

    const sparklineMarkup = renderToStaticMarkup(
      <Sparkline viewModel={sparkline} geometry={composeSparklineGeometry(sparkline, dimensions)} />,
    )

    expect(lineMarkup).toContain('WTI weekly history')
    expect(lineMarkup).toContain('oil-lint-time-series-chart__line')
    expect(sparklineMarkup).toContain('WTI short trend')
    expect(sparklineMarkup).toContain('oil-lint-sparkline__line')
  })
})
