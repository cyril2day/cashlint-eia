import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  Sparkline,
  composeSparklineGeometry,
  createChartDimensions,
  mapContextualizedSignalToSparkline,
  mapSparklineViewModelToWidgetInput,
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
import { none } from '@/shared/maybe'
import { isSuccess, type Result } from '@/shared/result'

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
  it('maps contextualized signal to sparkline view models', () => {
    const sparkline = mapContextualizedSignalToSparkline({
      id: 'wti-sparkline',
      label: 'WTI short trend',
      signal: contextualizedSignal,
      historicalPoints,
    })

    expect(sparkline.points).toHaveLength(3)
    expect(sparkline.displayState).toBe('Complete')
    expect('sourceSignal' in sparkline).toBe(false)
  })

  it('computes sparkline geometry using explicit dimensions', () => {
    const dimensions = unwrapSuccess(createChartDimensions(480, 220))

    const sparkline = mapContextualizedSignalToSparkline({
      id: 'wti-sparkline',
      label: 'WTI short trend',
      signal: contextualizedSignal,
      historicalPoints,
    })

    const sparklineGeometry = composeSparklineGeometry(sparkline, dimensions)

    expect(sparklineGeometry.linePath.kind).toBe('Some')
  })

  it('renders modular sparkline components without DOM mutation', () => {
    const dimensions = unwrapSuccess(createChartDimensions(480, 220))

    const sparkline = mapContextualizedSignalToSparkline({
      id: 'wti-sparkline',
      label: 'WTI short trend',
      signal: contextualizedSignal,
      historicalPoints,
    })

    const sparklineInput = mapSparklineViewModelToWidgetInput(sparkline)
    const sparklineMarkup = renderToStaticMarkup(
      <Sparkline input={sparklineInput} geometry={composeSparklineGeometry(sparklineInput, dimensions)} />,
    )

    expect(sparklineMarkup).toContain('WTI short trend')
    expect(sparklineMarkup).toContain('oil-lint-sparkline__line')
  })
})
