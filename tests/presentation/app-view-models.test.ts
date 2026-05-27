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
  title: 'Crude oil in storage',
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
  title: 'WTI spot price',
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
  title: 'Supply & demand balance',
  valueText: 'Mixed',
  statusLabel: 'Mixed',
  subtitleText: some('2026-05-19 · USTotal'),
  trendLabel: none(),
  anomalyLabel: none(),
  caveatLabel: none(),
  drilldownTarget: some('/balance'),
}

const availableSupplyCard: SummaryCardViewModel = {
  kind: 'availableSupply',
  title: 'Available supply',
  valueText: '17 million barrels per day',
  statusLabel: 'Firm',
  subtitleText: some('2026-05-19 · USTotal'),
  trendLabel: some('Up 0.2'),
  anomalyLabel: none(),
  caveatLabel: none(),
  drilldownTarget: some('/balance'),
}

const refineryDemandCard: SummaryCardViewModel = {
  kind: 'refineryDemand',
  title: 'Refinery demand',
  valueText: '16 million barrels per day',
  statusLabel: 'Steady',
  subtitleText: some('2026-05-19 · USTotal'),
  trendLabel: some('Down 0.1'),
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

const dashboardSummary: SummaryViewModel = {
  ...summary,
  cards: [inventoryCard, priceCard, availableSupplyCard, refineryDemandCard, balanceCard],
}

describe('app view models', () => {
  it('maps summary data into a home page model with navigation, controls, caveats, and trace', () => {
    const viewModel = mapSummaryToHomePageViewModel(summary)

    expect(viewModel.navigation.items.map(item => item.href)).toEqual(['/', '/inventory', '/price', '/balance', '/analysis', '/charts'])
    expect(viewModel.controls.submitLabel).toBe('Refresh live data')
    expect(viewModel.controls.comparisonWindowLabel).toBe('Latest weekly comparison window')
    expect(viewModel.primaryCharts.map(panel => panel.chartKind)).toEqual(['MetricCard', 'Sparkline', 'TimeSeries'])
    expect(viewModel.caveatPanel.caveats).toHaveLength(1)
    expect(viewModel.tracePanel.steps.map(step => step.label)).toContain('Analyst read composed')
    expect(summary.cards.map(card => card.drilldownTarget)).toEqual([some('/balance'), some('/inventory'), some('/price')])
  })

  it('maps homepage metrics to dedicated chart shapes with a shared history length', () => {
    const viewModel = mapSummaryToHomePageViewModel(dashboardSummary)

    expect(viewModel.metrics.map(metric => metric.chart.kind)).toEqual([
      'VarianceBars',
      'SparklineLine',
      'StackedArea',
      'BarSequence',
    ])
    expect(viewModel.metrics.map(metric => metric.chart.points.length)).toEqual([12, 12, 12, 12])
  })

  it('creates a gallery with the active chart kinds and honest unavailable states', () => {
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
    expect(gallery.panels.filter(panel => panel.state === 'Unavailable')).toHaveLength(8)
    expect(gallery.panels.filter(panel => panel.state === 'Complete')).toHaveLength(0)
    expect(gallery.stateSummary.map(item => `${item.label}:${item.valueLabel}`)).toEqual([
      'Ready:0',
      'Cautious:0',
      'Waiting:8',
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
