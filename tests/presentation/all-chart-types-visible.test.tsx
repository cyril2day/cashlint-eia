import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { SummaryCardViewModel, SummaryViewModel } from '@/presentation/contracts'
import { ChartGallery } from '@/presentation'
import { mapSummaryToChartsGalleryViewModel } from '@/presentation/mappers/chart-gallery-view-model'
import { none, some } from '@/shared/maybe'

const inventoryCard: SummaryCardViewModel = {
  kind: 'inventory',
  title: 'Inventory',
  valueText: '440 million barrels',
  statusLabel: 'Balanced',
  subtitleText: some('2026-05-19 · USTotal'),
  trendLabel: none(),
  anomalyLabel: none(),
  caveatLabel: none(),
  drilldownTarget: some('/inventory'),
}

const summary: SummaryViewModel = {
  reportWeekText: '2026-05-19',
  geographyText: 'USTotal',
  headline: 'Live weekly petroleum summary',
  summary: 'Live data is rendered through the presentation shell.',
  conditionLabel: 'Balanced',
  confidenceLabel: 'Medium',
  cards: [inventoryCard],
  caveats: [],
  displayState: 'partial',
  displayStateMessage: none(),
}

describe('all chart types visible', () => {
  it('renders every required chart widget kind in the gallery', () => {
    const gallery = mapSummaryToChartsGalleryViewModel(summary)
    const markup = renderToStaticMarkup(<ChartGallery viewModel={gallery} />)

    expect(gallery.panels.map(panel => panel.chartKind)).toEqual([
      'TimeSeries',
      'Sparkline',
      'MetricCard',
      'BarChart',
      'Histogram',
      'BoxPlot',
      'AreaChart',
      'VarianceChart',
    ])
    expect(markup).toContain('chart-panel--TimeSeries')
    expect(markup).toContain('chart-panel--Sparkline')
    expect(markup).toContain('chart-panel--MetricCard')
    expect(markup).toContain('chart-panel--BarChart')
    expect(markup).toContain('chart-panel--Histogram')
    expect(markup).toContain('chart-panel--BoxPlot')
    expect(markup).toContain('chart-panel--AreaChart')
    expect(markup).toContain('chart-panel--VarianceChart')
  })
})
