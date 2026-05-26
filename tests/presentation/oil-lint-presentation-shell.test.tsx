import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { OilLintPresentationShell } from '@/presentation'
import { mapSummaryToHomePageViewModel } from '@/presentation/mappers'
import type { SummaryViewModel } from '@/presentation/contracts/summary-view-model'
import { some } from '@/shared/maybe'

const viewModel: SummaryViewModel = {
  reportWeekText: '2026-05-19',
  geographyText: 'USTotal',
  headline: 'Live weekly petroleum summary',
  summary: 'Live data is rendered through the presentation shell.',
  conditionLabel: 'Balanced',
  confidenceLabel: 'Medium',
  cards: [],
  caveats: [],
  displayState: 'partial',
  displayStateMessage: some('Live output includes caveats.'),
}

describe('OilLintPresentationShell', () => {
  it('renders a minimal homepage with cards and charts only', () => {
    const markup = renderToStaticMarkup(<OilLintPresentationShell viewModel={mapSummaryToHomePageViewModel(viewModel)} />)

    expect(markup).not.toContain('Summary placeholders')
    expect(markup).toContain('The U.S. oil market, translated')
    expect(markup).toContain('This app reads it and tells you what it found.')
    expect(markup).not.toContain('The three things that matter')
    expect(markup).not.toContain('How this week compares to the past')
    expect(markup).not.toContain('<h2')
    expect(markup).not.toContain('hero-analysis')
    expect(markup).not.toContain('caveat-panel')
    expect(markup).not.toContain('How complete is this week')
    expect(markup).not.toContain('analysis-control')
    expect(markup).not.toContain('class="analysis-trace"')
  })
})
