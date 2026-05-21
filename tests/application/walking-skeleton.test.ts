import { describe, it, expect } from 'vitest'
import { success } from '@/shared/result'
import { some, none } from '@/shared/maybe'
import type { RawEiaEnvelope } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'
import { cond } from '@/shared/fp'
import type { Result } from '@/shared/result'
import type { UpstreamError } from '@/application/ports/eia-client'
import { buildWalkingSkeleton } from '@/application/workflows/walking-skeleton'
import type { EiaClient } from '@/application/ports/eia-client'
import type { WalkingSkeletonCommand } from '@/application/commands/walking-skeleton-command'

describe('walking-skeleton application workflow', () => {
  it('loads envelopes via EiaClient, translates, and returns WeeklyPetroleumFacts', async () => {
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

    const priceEnvelope: RawEiaEnvelope = {
      api: none(),
      request: none(),
      response: none(),
      data: some([
        { period: some('2022-01-01'), date: none(), value: some('80.5'), unit: some('USD/bbl'), series_id: some('RWTC'), series: none(), product: none(), geography: none(), frequency: some('weekly'), description: none(), notes: none() },
      ]),
      endpoint: some('/v2/petroleum/pri/spt/data/'),
      received_at: none(),
    }

    const defaultEnvelope: RawEiaEnvelope = { api: none(), request: none(), response: none(), data: some([]), endpoint: none(), received_at: none() }

    const choose: (r: { endpoint: string }) => Result<RawEiaEnvelope, UpstreamError> = cond([
      [(r: { endpoint: string }) => String(r.endpoint).includes('stoc'), () => success(inventoryEnvelope)],
      [(r: { endpoint: string }) => String(r.endpoint).includes('pri'), () => success(priceEnvelope)],
      [() => true, () => success(defaultEnvelope)],
    ])

    const fakeEiaClient: EiaClient = {
      loadRows: (req) => Promise.resolve(choose(req)),
    }

    const runner = buildWalkingSkeleton({ eiaClient: fakeEiaClient })

    const cmd: WalkingSkeletonCommand = { reportWeekIso: '2022-01-01' }

    const result = await runner(cmd)

    // Expect success Result
    expect(Reflect.get(result, 'ok')).toBe(true)
  })
})
