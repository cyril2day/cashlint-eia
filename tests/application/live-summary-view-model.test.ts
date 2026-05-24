import { describe, expect, it } from 'vitest'

import { buildLiveSummaryViewModel } from '@/application/workflows/build-live-summary-view-model'
import { createFakeEiaClient } from '@/application/ports/fake-eia-client'
import { createWalkingSkeletonDependencies } from '@/application/dependencies/walking-skeleton-dependencies'
import { cond } from '@/shared/fp'
import { ifElse } from '@/shared/fp'
import { isFailure, isSuccess, type Result, success } from '@/shared/result'
import type { EiaRequest, UpstreamError } from '@/application/ports/eia-client'
import { inventoryValidEnvelope } from '../fixtures/eia/stoc-wstk/inventory-valid'
import { priceValidEnvelope } from '../fixtures/eia/pri-spt/price-valid'

const requestForEnvelope = (request: EiaRequest): typeof inventoryValidEnvelope | typeof priceValidEnvelope =>
  cond<[EiaRequest], typeof inventoryValidEnvelope | typeof priceValidEnvelope>([
    [candidate => candidate.endpoint.includes('stoc'), () => inventoryValidEnvelope],
    [() => true, () => priceValidEnvelope],
  ])(request)

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    isSuccess,
    candidate => candidate.value,
    () => {
      throw new Error('expected success')
    },
  )(result)

const unwrapFailure = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): FailureValue =>
  ifElse(
    isFailure,
    candidate => candidate.error,
    () => {
      throw new Error('expected failure')
    },
  )(result)

describe('live summary view model', () => {
  it('maps live EIA fixtures into a presentation summary with real values', async () => {
    const fakeClient = createFakeEiaClient((request: EiaRequest) =>
      Promise.resolve(success(requestForEnvelope(request))),
    )

    const runner = buildLiveSummaryViewModel(
      createWalkingSkeletonDependencies({ eiaClient: fakeClient }),
    )

    const result = await runner({ reportWeekIso: '2026-01-09' })
    const summary = unwrapSuccess(result)

    expect(result.ok).toBe(true)
    expect(summary.reportWeekText).toBe('2026-01-09')
    expect(summary.geographyText).toBe('USTotal')
    expect(summary.displayState).toBe('partial')
    expect(summary.cards).toHaveLength(2)
    expect(summary.cards[0].valueText).toContain('836125')
    expect(summary.cards[1].valueText).toContain('76.31')
    expect(summary.cards[0].subtitleText).toEqual({ kind: 'Some', value: '2026-01-09 · USTotal' })
    expect(summary.cards[1].subtitleText).toEqual({ kind: 'Some', value: '2026-01-09 · USTotal' })
    expect(summary.cards[0].trendLabel).toEqual({ kind: 'Some', value: 'Down' })
    expect(summary.cards[1].trendLabel).toEqual({ kind: 'Some', value: 'Up' })
    expect(summary.headline).toContain('Crude inventory drew and WTI rose')
    expect(summary.caveats.map(caveat => caveat.kind)).not.toContain('missing-previous-observation')
    expect(summary.summary).toContain('Full system balance is not computed in this walking skeleton.')
  })

  it('returns a typed upstream failure when the underlying client fails', async () => {
    const fakeError: UpstreamError = {
      kind: 'UpstreamError',
      message: 'upstream unavailable',
    }

    const fakeClient = createFakeEiaClient(() => Promise.resolve({ ok: false, error: fakeError }))

    const runner = buildLiveSummaryViewModel(
      createWalkingSkeletonDependencies({ eiaClient: fakeClient }),
    )

    const result = await runner({ reportWeekIso: '2026-01-09' })
    const error = unwrapFailure(result)

    expect(result.ok).toBe(false)
    expect(error.kind).toBe('UpstreamFailure')
    expect(JSON.stringify(result)).not.toContain('secret-test-key')
  })
})
