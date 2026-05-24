import { describe, expect, it } from 'vitest'

import { validateEiaRuntimeConfig } from '@/infrastructure/eia'
import { ifElse } from '@/shared/fp'
import { none, some } from '@/shared/maybe'
import type { Result } from '@/shared/result'
import type { EiaRuntimeConfig, EiaRuntimeConfigurationError } from '@/infrastructure/eia'

const validInput = {
  baseUrl: 'https://api.eia.gov/',
  apiKey: some('test-key'),
  requireApiKey: true,
  timeoutMs: 500,
  retry: { maxAttempts: 2, delayMs: 0 },
  userAgent: none(),
}

const unwrapConfig = (result: Result<EiaRuntimeConfig, EiaRuntimeConfigurationError>): EiaRuntimeConfig =>
  ifElse(
    (candidate: Result<EiaRuntimeConfig, EiaRuntimeConfigurationError>) => candidate.ok === true,
    candidate => Reflect.get(candidate, 'value'),
    (): EiaRuntimeConfig => {
      throw new Error('expected valid config')
    },
  )(result)

describe('EIA runtime configuration', () => {
  it('validates runtime settings before adapter use', () => {
    const result = validateEiaRuntimeConfig(validInput)
    const config = unwrapConfig(result)

    expect(result.ok).toBe(true)
    expect(config.baseUrl.toString()).toBe('https://api.eia.gov/')
    expect(config.apiKey.kind).toBe('Some')
  })

  it('rejects malformed base URL and missing required API key distinctly', () => {
    expect(validateEiaRuntimeConfig({ ...validInput, baseUrl: 'not a url' })).toMatchObject({
      ok: false,
      error: { kind: 'MalformedBaseUrl' },
    })

    expect(validateEiaRuntimeConfig({ ...validInput, apiKey: some('   ') })).toMatchObject({
      ok: false,
      error: { kind: 'MissingApiKey' },
    })
  })

  it('rejects invalid timeout and retry policy values', () => {
    expect(validateEiaRuntimeConfig({ ...validInput, timeoutMs: 0 })).toMatchObject({
      ok: false,
      error: { kind: 'InvalidTimeout' },
    })

    expect(validateEiaRuntimeConfig({ ...validInput, retry: { maxAttempts: 0, delayMs: 0 } })).toMatchObject({
      ok: false,
      error: { kind: 'InvalidRetryCount' },
    })

    expect(validateEiaRuntimeConfig({ ...validInput, retry: { maxAttempts: 1, delayMs: -1 } })).toMatchObject({
      ok: false,
      error: { kind: 'InvalidRetryDelay' },
    })
  })
})
