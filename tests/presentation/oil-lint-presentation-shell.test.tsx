import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { OilLintPresentationShell } from '@/presentation'
import {
  createOilLintPresentationViewModel,
  oilLintPresentationViewModel,
} from '@/presentation/shell/oil-lint-presentation-view-model'

describe('OilLintPresentationShell', () => {
  it('renders the presentation shell regions', () => {
    const markup = renderToStaticMarkup(<OilLintPresentationShell viewModel={oilLintPresentationViewModel} />)

    expect(markup).toContain('Weekly analysis presentation shell')
    expect(markup).toContain('Walking-skeleton summary ready for presentation')
    expect(markup).toContain('USTotal')
    expect(markup).toContain('Inventory and WTI price cards')
    expect(markup).toContain('Presentation caveats')
    expect(markup).toContain('Display state')
    expect(markup).toContain('Unknown')
    expect(markup).toContain('Medium')
    expect(markup).toContain('80 ThousandBarrels')
    expect(markup).toContain('72 USDPerBarrel')
    expect(markup).toContain('Full system balance not computed')
  })

  it('renders empty state messaging safely', () => {
    const markup = renderToStaticMarkup(
      <OilLintPresentationShell viewModel={createOilLintPresentationViewModel('empty')} />,
    )

    expect(markup).toContain('Empty output')
    expect(markup).toContain('No supported summary data is available for this scope.')
  })
})