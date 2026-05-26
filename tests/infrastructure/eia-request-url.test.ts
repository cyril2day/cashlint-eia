import { describe, expect, it } from 'vitest'

import { buildInventoryRequest, buildPriceRequest, buildRefineryRequest, buildRefineryRequests, buildSupplyRequest } from '@/application/ports/eia-request-builders'
import { buildEiaRequestUrl, sanitizeEiaUrl, validateEiaRuntimeConfig } from '@/infrastructure/eia'
import { ifElse } from '@/shared/fp'
import { none, some } from '@/shared/maybe'

const config = validateEiaRuntimeConfig({
  baseUrl: 'https://api.eia.gov/',
  apiKey: some('secret-test-key'),
  requireApiKey: true,
  timeoutMs: 500,
  retry: { maxAttempts: 1, delayMs: 0 },
  userAgent: none(),
})

const unwrapConfig = () =>
  ifElse(
    (candidate: typeof config) => candidate.ok === true,
    candidate => Reflect.get(candidate, 'value'),
    () => {
      throw new Error('expected valid config')
    },
  )(config)

describe('EIA request URL construction', () => {
  it('keeps request descriptions secret-free for supported request families', () => {
    const requests = [
      buildInventoryRequest('2026-05-19'),
      buildPriceRequest('2026-05-19'),
      buildRefineryRequest('2026-05-19'),
      buildSupplyRequest('2026-05-19'),
    ]

    expect(requests.map(request => request.endpoint)).toEqual([
      '/v2/petroleum/stoc/wstk/data/',
      '/v2/petroleum/pri/spt/data/',
      '/v2/petroleum/pnp/wiup/data/',
      '/v2/petroleum/sum/sndw/data/',
    ])
    expect(JSON.stringify(requests)).not.toContain('secret-test-key')
  })

  it('injects API keys only at the infrastructure URL boundary and sanitizes them', () => {
    const url = buildEiaRequestUrl(unwrapConfig(), buildInventoryRequest('2026-05-19'))

    expect(url.toString()).toContain('api_key=secret-test-key')
    expect(url.toString()).toContain('frequency=weekly')
    expect(url.toString()).toContain('data%5B%5D=value')
    expect(url.toString()).toContain('facets%5Bseries%5D%5B%5D=WCRSTUS1')
    expect(url.toString()).toContain('facets%5Bduoarea%5D%5B%5D=NUS')
    expect(buildEiaRequestUrl(unwrapConfig(), buildPriceRequest('2026-05-19')).toString()).toContain('facets%5Bseries%5D%5B%5D=RWTC')
    expect(buildEiaRequestUrl(unwrapConfig(), buildRefineryRequest('2026-05-19')).toString()).toContain('facets%5Bseries%5D%5B%5D=WCRRIUS2')
    expect(buildEiaRequestUrl(unwrapConfig(), buildSupplyRequest('2026-05-19')).toString()).toContain('facets%5Bseries%5D%5B%5D=WCRFPUS2')
    expect(sanitizeEiaUrl(url)).toContain('api_key=%5BREDACTED%5D')
    expect(sanitizeEiaUrl(url)).not.toContain('secret-test-key')
  })

  it('preserves repeated EIA facet params for grouped series requests', () => {
    const url = buildEiaRequestUrl(unwrapConfig(), buildRefineryRequests('2026-05-19')[0])
    const seriesValues = url.searchParams.getAll('facets[series][]')

    expect(seriesValues).toEqual(['WCRRIUS2', 'WGIRIUS2', 'WOCLEUS2', 'WPULEUS3'])
  })
})
