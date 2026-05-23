import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PresentationErrorShell } from '@/presentation/shell/presentation-error-shell'
import { none, some } from '@/shared/maybe'

describe('PresentationErrorShell', () => {
  it('renders safe error details without leaking internal objects', () => {
    const markup = renderToStaticMarkup(
      <PresentationErrorShell
        title="Unable to render summary"
        message="A safe presentation error occurred."
        correlationId={some('corr-123')}
        retryHint={none()}
      />,
    )

    expect(markup).toContain('Unable to render summary')
    expect(markup).toContain('A safe presentation error occurred.')
    expect(markup).toContain('corr-123')
    expect(markup).toContain('No retry hint available')
  })
})