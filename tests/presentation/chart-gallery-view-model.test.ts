import { describe, expect, it } from 'vitest'

import type { SummaryCardViewModel, SummaryViewModel } from '@/presentation/contracts'
import { mapSummaryToChartsGalleryViewModel } from '@/presentation/mappers/chart-gallery-view-model'
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
  displayStateMessage: some('Live output includes caveats.'),
}

describe('chart gallery view model', () => {
  it('returns one honest panel for every active chart kind', () => {
    const gallery = mapSummaryToChartsGalleryViewModel(summary)

    expect(gallery.panels.map(panel => panel.chartKind)).toEqual([
      'Sparkline',
      'Histogram',
      'AreaChart',
    ])
    expect(gallery.panels).toHaveLength(3)
    expect(gallery.panels.map(panel => panel.chartViewModel.accessibilitySummary)).not.toContain('')
  })

  it('keeps insufficient runtime history unavailable instead of substituting zeros', () => {
    const gallery = mapSummaryToChartsGalleryViewModel(summary)

    expect(gallery.panels.filter(panel => panel.state === 'Unavailable')).toHaveLength(3)
    expect(gallery.panels.map(panel => panel.chartViewModel.accessibilitySummary)).not.toContain('0')
    expect(gallery.stateSummary.map(item => `${item.label}:${item.valueLabel}`)).toEqual([
      'Ready:0',
      'Cautious:0',
      'Waiting:3',
      'Needs history:0',
    ])
  })
})
