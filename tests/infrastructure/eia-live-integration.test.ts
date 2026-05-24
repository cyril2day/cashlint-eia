import { describe, expect, it } from 'vitest'

import { buildInventoryRequest } from '@/application/ports/eia-request-builders'
import { createRealEiaClient, validateEiaRuntimeConfig } from '@/infrastructure/eia'
import { none, some } from '@/shared/maybe'
import { allPass, ifElse } from '@/shared/fp'

const liveDescribe = ifElse(
  (value: string | undefined) => value === 'true',
  () => describe,
  () => describe.skip,
)(process.env.OIL_LINT_RUN_LIVE_EIA_TESTS)

const isNonEmptyEnvText = (value: string | undefined): value is string =>
  allPass([
    (candidate: string | undefined): candidate is string => candidate !== undefined,
    (candidate: string | undefined) => String(candidate).trim().length > 0,
  ])(value)

const envText = (value: string | undefined) =>
  ifElse(
    isNonEmptyEnvText,
    candidate => some(candidate.trim()),
    () => none(),
  )(value)

const envTextWithFallback = (value: string | undefined, fallback: string): string =>
  ifElse(
    (candidate: string | undefined): candidate is string => candidate !== undefined,
    candidate => candidate,
    () => fallback,
  )(value)

const configuredApiKeyText = (): string =>
  ifElse(
    (candidate: string | undefined): candidate is string => candidate !== undefined,
    candidate => candidate,
    () => 'unconfigured-api-key',
  )(process.env.EIA_API_KEY)

type LiveConfigResult = ReturnType<typeof validateEiaRuntimeConfig>

const isLiveConfigSuccess = (
  result: LiveConfigResult,
): result is Extract<LiveConfigResult, { readonly ok: true }> => result.ok === true

const unwrapLiveConfig = (result: LiveConfigResult) =>
  ifElse(
    isLiveConfigSuccess,
    candidate => candidate.value,
    () => {
      throw new Error('expected valid live EIA config')
    },
  )(result)

liveDescribe('EIA live integration harness', () => {
  it('loads a live inventory envelope only when explicitly enabled', async () => {
    const config = validateEiaRuntimeConfig({
      baseUrl: envTextWithFallback(process.env.EIA_BASE_URL, 'https://api.eia.gov/'),
      apiKey: envText(process.env.EIA_API_KEY),
      requireApiKey: true,
      timeoutMs: 15_000,
      retry: { maxAttempts: 2, delayMs: 250 },
      userAgent: none(),
    })

    expect(config.ok).toBe(true)

    const result = await createRealEiaClient(unwrapLiveConfig(config)).loadRows(buildInventoryRequest('2026-01-01'))

    expect(result.ok).toBe(true)
    expect(JSON.stringify(result)).not.toContain(configuredApiKeyText())
  })
})
