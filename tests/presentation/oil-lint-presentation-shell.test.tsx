import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { OilLintPresentationShell } from '@/presentation'

describe('OilLintPresentationShell', () => {
  it('renders the presentation shell regions', () => {
    const markup = renderToStaticMarkup(<OilLintPresentationShell />)

    expect(markup).toContain('Presentation shell for the weekly analysis experience')
    expect(markup).toContain('Summary region placeholder')
    expect(markup).toContain('Card grid shell')
    expect(markup).toContain('Caveat region shell')
    expect(markup).toContain('Error, empty, and partial states')
    expect(markup).toContain('Pending SummaryViewModel')
  })
})