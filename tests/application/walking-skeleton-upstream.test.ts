import { describe, it, expect } from 'vitest'
import { failure } from '@/shared/result'
import type { UpstreamError } from '@/application/ports/eia-client'
import { createFakeEiaClient } from '@/application/ports/fake-eia-client'
import { buildWalkingSkeleton } from '@/application/workflows/walking-skeleton'
import type { WalkingSkeletonCommand } from '@/application/commands/walking-skeleton-command'

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
})
