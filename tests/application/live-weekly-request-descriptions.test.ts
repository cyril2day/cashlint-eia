import { describe, expect, it } from 'vitest'
import { unwrap } from '@/shared/maybe'
import { buildLiveWeeklyRequests } from '@/application/workflows/live-weekly-request-descriptions'

describe('live-weekly request descriptions', () => {
  it('builds inventory, price, refinery, and supply requests from the live-weekly command', () => {
    const requests = buildLiveWeeklyRequests({ reportWeekIso: '2026-01-09' })

    expect(requests.inventoryRequest.endpoint).toBe('/v2/petroleum/stoc/wstk/data/')
    expect(requests.priceRequest.endpoint).toBe('/v2/petroleum/pri/spt/data/')
    expect(requests.refineryRequests.map(request => unwrap(request.params)?.['facets[series][]'])).toEqual([
      ['WCRRIUS2', 'WGIRIUS2', 'WOCLEUS2', 'WPULEUS3'],
    ])
    expect(requests.supplyRequests.map(request => unwrap(request.params)?.['facets[series][]'])).toEqual([
      ['WCRFPUS2', 'WCRIMUS2', 'WCREXUS2'],
    ])
    expect(unwrap(requests.inventoryRequest.params)).toEqual({
      end: '2026-01-09',
      frequency: 'weekly',
      'data[]': 'value',
      'sort[0][column]': 'period',
      'sort[0][direction]': 'desc',
      offset: '0',
      length: '12',
      'facets[series][]': 'WCRSTUS1',
      'facets[duoarea][]': 'NUS',
    })
    expect(unwrap(requests.priceRequest.params)).toEqual({
      end: '2026-01-09',
      frequency: 'weekly',
      'data[]': 'value',
      'sort[0][column]': 'period',
      'sort[0][direction]': 'desc',
      offset: '0',
      length: '12',
      'facets[series][]': 'RWTC',
    })
  })
})
