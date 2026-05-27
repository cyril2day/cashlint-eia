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
  it('renders the warm dashboard shell without legacy workbench panels', () => {
    const markup = renderToStaticMarkup(<OilLintPresentationShell viewModel={mapSummaryToHomePageViewModel(viewModel)} />)

    expect(markup).not.toContain('Summary placeholders')
    expect(markup).toContain('The crude balance came in roughly even.')
    expect(markup).toContain('Week ending 2026-05-19')
    expect(markup).toContain('Balance snapshot')
    expect(markup).toContain('Crude Stocks')
    expect(markup).toContain('WTI Price')
    expect(markup).toContain('Weekly Analysis')
    expect(markup).not.toContain('The three things that matter')
    expect(markup).not.toContain('How this week compares to the past')
    expect(markup).not.toContain('hero-analysis')
    expect(markup).not.toContain('caveat-panel')
    expect(markup).not.toContain('How complete is this week')
    expect(markup).not.toContain('analysis-control')
    expect(markup).not.toContain('class="analysis-trace"')
  })
})
