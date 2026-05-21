import { describe, it, expect } from 'vitest'
import { failure, success } from '@/shared/result'
import { none, some } from '@/shared/maybe'
import { ifElse } from '@/shared/fp'
import type { UpstreamError } from '@/application/ports/eia-client'
import { createFakeEiaClient } from '@/application/ports/fake-eia-client'
import { buildWalkingSkeleton } from '@/application/workflows/walking-skeleton'
import type { WalkingSkeletonCommand } from '@/application/commands/walking-skeleton-command'
import type { RawEiaEnvelope } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'

describe('walking-skeleton upstream failure handling', () => {
  it('maps upstream load failure into ApplicationError.UpstreamFailure', async () => {
    const upstreamErr: UpstreamError = { kind: 'UpstreamError', message: 'network failure' }

    const fakeClient = createFakeEiaClient(() => Promise.resolve(failure(upstreamErr)))

    const runner = buildWalkingSkeleton({ eiaClient: fakeClient })

    const cmd: WalkingSkeletonCommand = { reportWeekIso: '2022-01-01' }

    const result = await runner(cmd)

    expect(Reflect.get(result, 'ok')).toBe(false)
    const appErr = Reflect.get(result, 'error')
    expect(appErr.kind).toBe('UpstreamFailure')
    expect(appErr.error).toEqual(upstreamErr)
  })

  it('maps price load failure into ApplicationError.UpstreamFailure after inventory succeeds', async () => {
    const upstreamErr: UpstreamError = { kind: 'UpstreamError', message: 'price service down' }

    const inventoryEnvelope: RawEiaEnvelope = {
      api: none(),
      request: none(),
      response: none(),
      data: some([
        { period: some('2022-01-01'), date: none(), value: some('10'), unit: some('MBBL'), series_id: some('WCRSTUS1'), series: none(), product: none(), geography: none(), frequency: some('weekly'), description: none(), notes: none() },
      ]),
      endpoint: some('/v2/petroleum/stoc/wstk/data/'),
      received_at: none(),
    }

    const choose = ifElse(
      (request: { endpoint: string }) => request.endpoint.includes('stoc'),
      () => Promise.resolve(success(inventoryEnvelope)),
      () => Promise.resolve(failure(upstreamErr)),
    )

    const fakeClient = createFakeEiaClient((request) => choose(request))

    const runner = buildWalkingSkeleton({ eiaClient: fakeClient })

    const cmd: WalkingSkeletonCommand = { reportWeekIso: '2022-01-01' }

    const result = await runner(cmd)

    expect(Reflect.get(result, 'ok')).toBe(false)
    const appErr = Reflect.get(result, 'error')
    expect(appErr.kind).toBe('UpstreamFailure')
    expect(appErr.error).toEqual(upstreamErr)
  })
})
