import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { SummaryCardViewModel, SummaryViewModel } from '@/presentation/contracts'
import {
  AnalysisControlPanel,
  ChartGallery,
  ChartStateMessage,
  DetailPageContent,
  ProductNavigation,
} from '@/presentation'
import {
  createAnalysisControlViewModel,
  createProductNavigationViewModel,
  mapSummaryToChartsGalleryViewModel,
  mapSummaryToInventoryDetailViewModel,
} from '@/presentation/mappers'
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
  displayState: 'complete',
  displayStateMessage: none(),
}

describe('rich UI components', () => {
  it('renders navigation and controls with accessible user-facing affordances', () => {
    const navMarkup = renderToStaticMarkup(<ProductNavigation viewModel={createProductNavigationViewModel('charts')} />)
    const controlMarkup = renderToStaticMarkup(<AnalysisControlPanel viewModel={createAnalysisControlViewModel(summary)} />)

    expect(navMarkup).toContain('aria-label="Product navigation"')
    expect(navMarkup).toContain('aria-current="page"')
    expect(controlMarkup).toContain('Refresh live data')
    expect(controlMarkup).toContain('Advanced report-week search is deferred')
  })

  it('renders the chart gallery with all chart panels visible', () => {
    const markup = renderToStaticMarkup(<ChartGallery viewModel={mapSummaryToChartsGalleryViewModel(summary)} />)

    expect(markup).toContain('Visual analysis gallery')
    expect(markup).toContain('TimeSeries')
    expect(markup).toContain('Sparkline')
    expect(markup).toContain('MetricCard')
    expect(markup).toContain('BarChart')
    expect(markup).toContain('Histogram')
    expect(markup).toContain('BoxPlot')
    expect(markup).toContain('AreaChart')
    expect(markup).toContain('VarianceChart')
    expect(markup).toContain('metric-card-chart')
    expect(markup).toContain('oil-lint-time-series-chart')
    expect(markup).toContain('variance-chart')
  })

  it('renders detail content and explicit chart state messages', () => {
    const detailMarkup = renderToStaticMarkup(<DetailPageContent viewModel={mapSummaryToInventoryDetailViewModel(summary)} />)
    const stateMarkup = renderToStaticMarkup(<ChartStateMessage state="Unavailable" />)

    expect(detailMarkup).toContain('Detail rows')
    expect(detailMarkup).toContain('Inventory facts and visual states')
    expect(stateMarkup).toContain('runtime history loading is deferred')
  })
})
