import { describe, expect, it } from 'vitest'

import { buildInventoryRequest, buildPriceRequest, buildRefineryRequest, buildSupplyRequest } from '@/application/ports/eia-request-builders'
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
    expect(sanitizeEiaUrl(url)).toContain('api_key=%5BREDACTED%5D')
    expect(sanitizeEiaUrl(url)).not.toContain('secret-test-key')
  })
})
