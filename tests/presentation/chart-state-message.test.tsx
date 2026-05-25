import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ChartStateMessage } from '@/presentation'

describe('chart state message', () => {
  it('renders explicit partial and unavailable states', () => {
    const partialMarkup = renderToStaticMarkup(<ChartStateMessage state="Partial" />)
    const unavailableMarkup = renderToStaticMarkup(<ChartStateMessage state="Unavailable" />)

    expect(partialMarkup).toContain('Useful signal')
    expect(partialMarkup).toContain('role="status"')
    expect(unavailableMarkup).toContain('current run did not return')
    expect(unavailableMarkup).toContain('chart-state-message--Unavailable')
  })
})
