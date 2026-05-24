import { describe, expect, it } from 'vitest'

import { buildInventoryRequest } from '@/application/ports/eia-request-builders'
import { createRealEiaClient, validateEiaRuntimeConfig, type EiaAdapterLogEvent, type EiaFetch } from '@/infrastructure/eia'
import { ifElse } from '@/shared/fp'
import { none, some } from '@/shared/maybe'

const configResult = validateEiaRuntimeConfig({
  baseUrl: 'https://api.eia.gov/',
  apiKey: some('secret-test-key'),
  requireApiKey: true,
  timeoutMs: 10,
  retry: { maxAttempts: 2, delayMs: 0 },
  userAgent: none(),
})

const config = () =>
  ifElse(
    (candidate: typeof configResult) => candidate.ok === true,
    candidate => Reflect.get(candidate, 'value'),
    () => {
      throw new Error('expected valid config')
    },
  )(configResult)

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const request = buildInventoryRequest('2026-05-19')

describe('real EIA HTTP adapter', () => {
  it('returns normalized raw EIA envelopes without calling ACL translators', async () => {
    const fetchCalls: string[] = []
    const fakeFetch: EiaFetch = async input => {
      fetchCalls.push(input.toString())

      return jsonResponse({
        response: {
          data: [
            {
              period: '2026-05-19',
              value: '10',
              units: 'MBBL',
              series_id: 'WCRSTUS1',
              frequency: 'weekly',
            },
          ],
        },
        request: {
          params: {
            api_key: 'secret-test-key',
          },
        },
      })
    }

    const client = createRealEiaClient(config(), {
      fetch: fakeFetch,
      delay: () => Promise.resolve(),
      logger: none(),
      correlationId: some('corr-1'),
    })

    const result = await client.loadRows(request)

    expect(result.ok).toBe(true)
    expect(fetchCalls[0]).toContain('api_key=secret-test-key')
    expect(Reflect.get(Reflect.get(result, 'value'), 'data')).toMatchObject({
      kind: 'Some',
      value: [{ period: some('2026-05-19'), unit: some('MBBL') }],
    })
    expect(Reflect.get(Reflect.get(result, 'value'), 'request')).toMatchObject({
      kind: 'Some',
      value: { params: { api_key: '[REDACTED]' } },
    })
    expect(Reflect.get(Reflect.get(result, 'value'), 'endpoint')).toEqual(some('/v2/petroleum/stoc/wstk/data/'))
    expect(JSON.stringify(result)).not.toContain('secret-test-key')
  })

  it('maps HTTP statuses to typed sanitized upstream errors', async () => {
    const client = createRealEiaClient(config(), {
      fetch: async () => jsonResponse({ error: 'slow down' }, 429),
      delay: () => Promise.resolve(),
      logger: none(),
      correlationId: some('corr-2'),
    })

    const result = await client.loadRows(request)

    expect(result).toMatchObject({
      ok: false,
      error: {
        kind: 'UpstreamHttpStatus',
        status: 429,
        category: 'RateLimited',
        retriable: true,
        correlationId: some('corr-2'),
      },
    })
    expect(JSON.stringify(result)).not.toContain('secret-test-key')
  })

  it('retries transient failures and succeeds on a later attempt', async () => {
    let calls = 0
    const fakeFetch: EiaFetch = async () => {
      calls += 1

      return ifElse(
        (candidate: number) => candidate === 1,
        () => jsonResponse({ error: 'temporary' }, 503),
        () => jsonResponse({ response: { data: [{ period: '2026-05-19', value: '10' }] } }),
      )(calls)
    }

    const client = createRealEiaClient(config(), {
      fetch: fakeFetch,
      delay: () => Promise.resolve(),
      logger: none(),
      correlationId: none(),
    })

    const result = await client.loadRows(request)

    expect(result.ok).toBe(true)
    expect(calls).toBe(2)
  })

  it('does not retry non-retriable malformed responses', async () => {
    let calls = 0
    const client = createRealEiaClient(config(), {
      fetch: async () => {
        calls += 1

        return jsonResponse({ response: { data: 'not rows' } })
      },
      delay: () => Promise.resolve(),
      logger: none(),
      correlationId: none(),
    })

    const result = await client.loadRows(request)

    expect(result).toMatchObject({
      ok: false,
      error: { kind: 'UpstreamMalformedResponse', retriable: false },
    })
    expect(calls).toBe(1)
  })

  it('maps network failures and timeout aborts to typed sanitized upstream errors', async () => {
    const networkClient = createRealEiaClient(config(), {
      fetch: async () => {
        throw new TypeError('connection refused')
      },
      delay: () => Promise.resolve(),
      logger: none(),
      correlationId: none(),
    })

    const timeoutClient = createRealEiaClient(config(), {
      fetch: async (_input, init) => {
        init?.signal?.dispatchEvent(new Event('abort'))
        throw new DOMException('aborted', 'AbortError')
      },
      delay: () => Promise.resolve(),
      logger: none(),
      correlationId: none(),
    })

    const networkResult = await networkClient.loadRows(request)
    const timeoutResult = await timeoutClient.loadRows(request)

    expect(networkResult).toMatchObject({
      ok: false,
      error: { kind: 'UpstreamNetworkFailure', retriable: true },
    })
    expect(timeoutResult).toMatchObject({
      ok: false,
      error: { kind: 'UpstreamTimeout', timeoutMs: 10, retriable: true },
    })
    expect(JSON.stringify(networkResult)).not.toContain('secret-test-key')
    expect(JSON.stringify(timeoutResult)).not.toContain('secret-test-key')
  })

  it('emits sanitized log events with safe correlation context', async () => {
    const events: EiaAdapterLogEvent[] = []
    const client = createRealEiaClient(config(), {
      fetch: async () => jsonResponse({ response: { data: [{ period: '2026-05-19', value: '10' }] } }),
      delay: () => Promise.resolve(),
      logger: some({
        info: event => {
          events.push(event)
        },
        warn: event => {
          events.push(event)
        },
      }),
      correlationId: some('corr-log'),
    })

    await client.loadRows(request)

    expect(events.map(event => event.kind)).toContain('RequestStarted')
    expect(events.map(event => event.kind)).toContain('RequestSucceeded')
    expect(JSON.stringify(events)).toContain('corr-log')
    expect(JSON.stringify(events)).not.toContain('secret-test-key')
  })
})
