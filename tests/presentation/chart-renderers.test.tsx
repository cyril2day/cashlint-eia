import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type {
  AreaChartViewModel,
  BoxPlotViewModel,
  HistogramViewModel,
  VarianceChartViewModel,
} from '@/presentation/charts/contracts'
import {
  AreaChart,
  BoxPlotChart,
  HistogramChart,
  VarianceChart,
} from '@/presentation'
import { none, some } from '@/shared/maybe'

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

const boxPlot: BoxPlotViewModel = {
  id: 'box-plot',
  title: 'WTI spread',
  subtitle: none(),
  unitLabel: none(),
  summary: some({
    minimum: 68,
    firstQuartile: 69,
    median: 70,
    thirdQuartile: 71,
    maximum: 72,
  }),
  outliers: [],
  currentMarker: some({ value: 72, label: 'Current 72' }),
  referenceMarkers: [{ value: 70, label: 'Baseline 70' }],
  caveats: [],
  accessibilitySummary: 'WTI spread box plot.',
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
  baseline: some({ value: 68, label: 'Zero baseline' }),
  currentMarker: some({ x: 3, y: 72, label: 'Current 72' }),
  referenceMarkers: [],
  caveats: [],
  accessibilitySummary: 'WTI magnitude area chart.',
  displayState: 'Complete',
}

const variance: VarianceChartViewModel = {
  id: 'variance',
  title: 'WTI baseline variance',
  subtitle: none(),
  unitLabel: none(),
  referenceSemantics: 'Interpretation baseline average',
  entries: [{
    category: 'WTI',
    actualValue: 72,
    actualValueLabel: '72',
    reference: {
      label: 'Baseline',
      value: 70,
      valueLabel: '70',
    },
    varianceAmount: 2,
    varianceAmountLabel: '2',
    variancePercentageLabel: some('2.9%'),
    directionLabel: 'Above reference',
    caveats: [],
  }],
  caveats: [],
  accessibilitySummary: 'WTI variance chart.',
  displayState: 'Complete',
}

describe('chart renderers', () => {
  it('renders histogram, box plot, area, and variance as svg chart visuals', () => {
    const markup = [
      renderToStaticMarkup(<HistogramChart viewModel={histogram} />),
      renderToStaticMarkup(<BoxPlotChart viewModel={boxPlot} />),
      renderToStaticMarkup(<AreaChart viewModel={area} />),
      renderToStaticMarkup(<VarianceChart viewModel={variance} />),
    ].join('')

    expect(markup).toContain('histogram-chart__svg')
    expect(markup).toContain('box-plot-chart__box')
    expect(markup).toContain('area-chart__area')
    expect(markup).toContain('variance-chart__bar')
  })
})
