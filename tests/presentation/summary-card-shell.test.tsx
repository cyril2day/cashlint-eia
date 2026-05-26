import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SummaryCardShell } from '@/presentation/shell/summary-card-shell'
import { none, some } from '@/shared/maybe'

describe('SummaryCardShell', () => {
  it('renders the full card contract and handles unavailable fields safely', () => {
    const markup = renderToStaticMarkup(
      <SummaryCardShell
        kind="inventory"
        title="Inventory"
        valueText="80 ThousandBarrels"
        statusLabel="Pending"
        subtitleText={some('2026-05-19 · USTotal')}
        trendLabel={none()}
        anomalyLabel={some('Inventory anomaly is not computed yet.')}
        caveatLabel={none()}
        drilldownTarget={none()}
        chart={none()}
      />,
    )

    expect(markup).toContain('Inventory')
    expect(markup).toContain('80 ThousandBarrels')
    expect(markup).toContain('Pending')
    expect(markup).not.toContain('2026-05-19 · USTotal')
    expect(markup).toContain('Not enough history')
    expect(markup).not.toContain('No caveat attached')
    expect(markup).toContain('Inventory anomaly is not computed yet.')
  })
})
