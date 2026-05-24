import { describe, expect, it } from 'vitest'
import { unwrap } from '@/shared/maybe'
import { buildWalkingSkeletonRequests } from '@/application/workflows/walking-skeleton-request-descriptions'

describe('walking-skeleton request descriptions', () => {
  it('builds inventory and price requests from the walking-skeleton command', () => {
    const requests = buildWalkingSkeletonRequests({ reportWeekIso: '2026-01-09' })

    expect(requests.inventoryRequest.endpoint).toBe('/v2/petroleum/stoc/wstk/data/')
    expect(requests.priceRequest.endpoint).toBe('/v2/petroleum/pri/spt/data/')
    expect(unwrap(requests.inventoryRequest.params)).toEqual({
      start: '2026-01-09',
      frequency: 'weekly',
      'data[]': 'value',
      'sort[0][column]': 'period',
      'sort[0][direction]': 'desc',
      offset: '0',
      length: '2',
      'facets[series][]': 'WCRSTUS1',
      'facets[duoarea][]': 'NUS',
    })
    expect(unwrap(requests.priceRequest.params)).toEqual({
      start: '2026-01-09',
      frequency: 'weekly',
      'data[]': 'value',
      'sort[0][column]': 'period',
      'sort[0][direction]': 'desc',
      offset: '0',
      length: '2',
      'facets[series][]': 'RWTC',
    })
  })
})
