import { describe, expect, it } from 'vitest'

import type { SummaryCardViewModel, SummaryViewModel } from '@/presentation/contracts'
import {
  mapSummaryToAnalysisDetailViewModel,
  mapSummaryToBalanceDetailViewModel,
  mapSummaryToChartsGalleryViewModel,
  mapSummaryToInventoryDetailViewModel,
  mapSummaryToPriceDetailViewModel,
  mapSummaryToHomePageViewModel,
} from '@/presentation/mappers'
import { none, some } from '@/shared/maybe'

const inventoryCard: SummaryCardViewModel = {
  kind: 'inventory',
  title: 'Inventory',
  valueText: '440 million barrels',
  statusLabel: 'Balanced',
  subtitleText: some('2026-05-19 · USTotal'),
  trendLabel: some('Trend flat'),
  anomalyLabel: none(),
  caveatLabel: none(),
  drilldownTarget: some('/inventory'),
}

const priceCard: SummaryCardViewModel = {
  kind: 'price',
  title: 'WTI price',
  valueText: '72 USDPerBarrel',
  statusLabel: 'Watched',
  subtitleText: some('2026-05-19 · USTotal'),
  trendLabel: some('Trend up'),
  anomalyLabel: some('Anomaly normal'),
  caveatLabel: some('Runtime history is partial.'),
  drilldownTarget: some('/price'),
}

const balanceCard: SummaryCardViewModel = {
  kind: 'system',
  title: 'System balance',
  valueText: 'Mixed',
  statusLabel: 'Mixed',
  subtitleText: some('2026-05-19 · USTotal'),
  trendLabel: none(),
  anomalyLabel: none(),
  caveatLabel: none(),
  drilldownTarget: some('/balance'),
}

const summary: SummaryViewModel = {
  reportWeekText: '2026-05-19',
  geographyText: 'USTotal',
  headline: 'Live weekly petroleum summary',
  summary: 'Live data is rendered through the presentation shell.',
  conditionLabel: 'Balanced',
  confidenceLabel: 'Medium',
  cards: [balanceCard, inventoryCard, priceCard],
  caveats: [
    {
      kind: 'trend-not-computed',
      title: 'Runtime history deferred',
      message: 'Historical context is deferred.',
      severity: 'info',
    },
  ],
  displayState: 'partial',
  displayStateMessage: some('Live output includes caveats.'),
}

describe('app view models', () => {
  it('maps summary data into a home page model with navigation, controls, caveats, and trace', () => {
    const viewModel = mapSummaryToHomePageViewModel(summary)

    expect(viewModel.navigation.items.map(item => item.href)).toEqual(['/', '/inventory', '/price', '/balance', '/analysis', '/charts'])
    expect(viewModel.controls.submitLabel).toBe('Refresh live data')
    expect(viewModel.primaryCharts.map(panel => panel.chartKind)).toEqual(['MetricCard', 'Sparkline', 'TimeSeries'])
    expect(viewModel.caveatPanel.caveats).toHaveLength(1)
    expect(viewModel.tracePanel.steps.map(step => step.label)).toContain('Weekly story composed')
  })

  it('creates a gallery with all eight chart kinds and honest unavailable states', () => {
    const gallery = mapSummaryToChartsGalleryViewModel(summary)

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
    expect(gallery.panels.filter(panel => panel.state === 'Unavailable')).toHaveLength(7)
    expect(gallery.panels.filter(panel => panel.state === 'Complete')).toHaveLength(1)
    expect(gallery.stateSummary.map(item => `${item.label}:${item.valueLabel}`)).toEqual([
      'Ready:1',
      'Cautious:0',
      'Waiting:7',
      'Needs history:0',
    ])
  })

  it('maps detail pages without losing card caveats or substituting missing values with zero', () => {
    const inventory = mapSummaryToInventoryDetailViewModel(summary)
    const price = mapSummaryToPriceDetailViewModel(summary)
    const balance = mapSummaryToBalanceDetailViewModel(summary)
    const analysis = mapSummaryToAnalysisDetailViewModel(summary)

    expect(inventory.rows.map(row => row.value)).toEqual(['440 million barrels'])
    expect(price.rows[0].caveats.kind).toBe('Some')
    expect(balance.charts.map(panel => panel.chartKind)).toEqual(['BarChart', 'VarianceChart'])
    expect(analysis.rows.map(row => row.value)).not.toContain('0')
  })
})
