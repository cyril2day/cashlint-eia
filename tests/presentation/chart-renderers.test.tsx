import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { AreaChartViewModel, HistogramViewModel, SparklineViewModel } from '@/presentation/charts/contracts'
import {
  AreaChart,
  Sparkline,
  composeSparklineGeometry,
  createChartDimensions,
  HistogramChart,
  mapAreaChartViewModelToWidgetInput,
  mapHistogramViewModelToWidgetInput,
  mapSparklineViewModelToWidgetInput,
} from '@/presentation'
import { ifElse } from '@/shared/fp'
import { none, some } from '@/shared/maybe'
import { isSuccess, type Result } from '@/shared/result'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    isSuccess,
    candidate => candidate.value,
    () => {
      throw new Error('expected success')
    },
  )(result)

const histogram: HistogramViewModel = {
  id: 'histogram',
  title: 'WTI distribution',
  subtitle: none(),
  unitLabel: none(),
  values: [
    { value: 68, label: '2026-05-05' },
    { value: 70, label: '2026-05-12' },
    { value: 72, label: '2026-05-19' },
  ],
  binStrategy: { kind: 'Automatic', requestedBinCount: 3 },
  currentMarker: some({ value: 72, label: 'Current 72' }),
  referenceMarkers: [{ value: 70, label: 'Baseline 70' }],
  caveats: [],
  accessibilitySummary: 'WTI distribution histogram.',
  displayState: 'Complete',
}

const sparkline: SparklineViewModel = {
  id: 'sparkline',
  label: 'WTI short trend',
  points: [
    { x: 1, y: 68, reportWeekIso: '2026-05-05', isCurrent: false },
    { x: 2, y: 70, reportWeekIso: '2026-05-12', isCurrent: false },
    { x: 3, y: 72, reportWeekIso: '2026-05-19', isCurrent: true },
  ],
  currentPoint: some({ x: 3, y: 72, reportWeekIso: '2026-05-19', isCurrent: true }),
  caveats: [],
  accessibilitySummary: 'WTI short trend sparkline.',
  displayState: 'Complete',
}

const area: AreaChartViewModel = {
  id: 'area',
  title: 'WTI magnitude',
  subtitle: none(),
  unitLabel: none(),
  points: [
    { x: 1, y: some(68), reportWeekIso: '2026-05-05', valueLabel: some('68'), caveats: [] },
    { x: 2, y: some(70), reportWeekIso: '2026-05-12', valueLabel: some('70'), caveats: [] },
    { x: 3, y: some(72), reportWeekIso: '2026-05-19', valueLabel: some('72'), caveats: [] },
  ],
  baseline: some({ value: 0, label: 'Zero baseline' }),
  currentMarker: some({ x: 3, y: 72, label: 'Current 72' }),
  referenceMarkers: [],
  caveats: [],
  accessibilitySummary: 'WTI magnitude area chart.',
  displayState: 'Complete',
}

describe('chart renderers', () => {
  it('renders sparkline, histogram, and area chart as svg chart visuals', () => {
    const sparklineInput = mapSparklineViewModelToWidgetInput(sparkline)
    const dimensions = unwrapSuccess(createChartDimensions(520, 120))
    const markup = [
      renderToStaticMarkup(<Sparkline input={sparklineInput} geometry={composeSparklineGeometry(sparklineInput, dimensions)} />),
      renderToStaticMarkup(<HistogramChart input={mapHistogramViewModelToWidgetInput(histogram)} />),
      renderToStaticMarkup(<AreaChart input={mapAreaChartViewModelToWidgetInput(area)} xAxisTickCount={3} />),
    ].join('')

    expect(markup).toContain('oil-lint-sparkline__line')
    expect(markup).toContain('histogram-chart__svg')
    expect(markup).toContain('area-chart__area')
  })
})
