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
  it('renders all chart panels and the readiness summary', () => {
    const markup = renderToStaticMarkup(<ChartGallery viewModel={mapSummaryToChartsGalleryViewModel(summary)} />)

    expect(markup).toContain('Chart readiness summary')
    expect(markup).toContain('Inventory time series')
    expect(markup).toContain('WTI sparkline')
    expect(markup).toContain('Inventory metric card')
    expect(markup).toContain('Balance driver bars')
    expect(markup).toContain('WTI distribution histogram')
    expect(markup).toContain('Inventory box plot')
    expect(markup).toContain('Inventory area chart')
    expect(markup).toContain('Balance variance chart')
    expect(markup).toContain('current run did not return')
  })
})
