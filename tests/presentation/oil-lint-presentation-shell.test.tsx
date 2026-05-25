import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { OilLintPresentationShell } from '@/presentation'
import { mapSummaryToRichHomeViewModel } from '@/presentation/mappers'
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
  it('renders the summary metrics region without placeholder wording', () => {
    const markup = renderToStaticMarkup(<OilLintPresentationShell viewModel={mapSummaryToRichHomeViewModel(viewModel)} />)

    expect(markup).toContain('aria-label="Summary metrics"')
    expect(markup).not.toContain('Summary placeholders')
    expect(markup).toContain('Live weekly petroleum summary')
    expect(markup).toContain('Live data is rendered through the presentation shell.')
  })
})
