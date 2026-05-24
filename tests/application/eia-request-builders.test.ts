import { describe, it, expect } from 'vitest'
import { buildInventoryRequest, buildPriceRequest } from '@/application/ports/eia-request-builders'

describe('EIA request builders', () => {
  it('builds inventory request with correct endpoint and params', () => {
    const week = '2026-01-01'
    const req = buildInventoryRequest(week)

    expect(req).toEqual({
      endpoint: '/v2/petroleum/stoc/wstk/data/',
      params: {
        kind: 'Some',
        value: {
          start: week,
          frequency: 'weekly',
          'data[]': 'value',
          'facets[series][]': 'WCRSTUS1',
          'facets[duoarea][]': 'NUS',
        },
      },
    })
  })

  it('builds price request with correct endpoint and params', () => {
    const week = '2026-01-01'
    const req = buildPriceRequest(week)

    expect(req).toEqual({
      endpoint: '/v2/petroleum/pri/spt/data/',
      params: {
        kind: 'Some',
        value: {
          start: week,
          frequency: 'weekly',
          'data[]': 'value',
          'facets[series][]': 'RWTC',
        },
      },
    })
  })
})
