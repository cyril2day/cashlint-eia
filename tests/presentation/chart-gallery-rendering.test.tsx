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

describe('chart gallery rendering', () => {
  it('renders all active chart panels', () => {
    const markup = renderToStaticMarkup(<ChartGallery viewModel={mapSummaryToChartsGalleryViewModel(summary)} />)

    expect(markup).toContain('WTI trend window')
    expect(markup).toContain('WTI trend sparkline')
    expect(markup).toContain('WTI spot price')
    expect(markup).toContain('Physical balance contributors')
    expect(markup).toContain('WTI sample distribution')
    expect(markup).toContain('WTI spread and quartiles')
    expect(markup).toContain('Commercial crude stock level')
    expect(markup).toContain('WTI baseline variance')
  })
})
