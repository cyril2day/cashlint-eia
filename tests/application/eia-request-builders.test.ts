import { describe, it, expect } from 'vitest'
import { buildInventoryRequest, buildPriceRequest, buildRefineryRequests, buildSupplyRequests } from '@/application/ports/eia-request-builders'
import type { EiaRequest, EiaRequestParamValue } from '@/application/ports/eia-client'
import { ifElse } from '@/shared/fp'

const seriesParam = (request: EiaRequest): EiaRequestParamValue =>
  ifElse(
    (params: EiaRequest['params']) => params.kind === 'Some',
    params => params.value['facets[series][]'],
    () => '',
  )(request.params)

const lengthParam = (request: EiaRequest): string =>
  ifElse(
    (params: EiaRequest['params']) => params.kind === 'Some',
    params => String(params.value.length),
    () => '',
  )(request.params)

describe('EIA request builders', () => {
  it('builds inventory request with correct endpoint and params', () => {
    const week = '2026-01-01'
    const req = buildInventoryRequest(week)

    expect(req).toEqual({
      endpoint: '/v2/petroleum/stoc/wstk/data/',
      params: {
        kind: 'Some',
        value: {
          end: week,
          frequency: 'weekly',
          'data[]': 'value',
          'sort[0][column]': 'period',
          'sort[0][direction]': 'desc',
          offset: '0',
          length: '12',
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
          end: week,
          frequency: 'weekly',
          'data[]': 'value',
          'sort[0][column]': 'period',
          'sort[0][direction]': 'desc',
          offset: '0',
          length: '12',
          'facets[series][]': 'RWTC',
        },
      },
    })
  })

  it('builds grouped weekly history requests for refinery and supply series', () => {
    const week = '2026-01-01'
    const refinery = buildRefineryRequests(week)
    const supply = buildSupplyRequests(week)

    expect(refinery.map(request => request.endpoint)).toEqual([
      '/v2/petroleum/pnp/wiup/data/',
    ])
    expect(refinery.map(seriesParam)).toEqual([
      ['WCRRIUS2', 'WGIRIUS2', 'WOCLEUS2', 'WPULEUS3'],
    ])
    expect(supply.map(seriesParam)).toEqual([
      ['WCRFPUS2', 'WCRIMUS2', 'WCREXUS2'],
    ])
    expect(refinery.map(lengthParam)).toEqual(['48'])
    expect(supply.map(lengthParam)).toEqual(['36'])
  })
})
