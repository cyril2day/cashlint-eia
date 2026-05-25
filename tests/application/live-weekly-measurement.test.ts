import { describe, it, expect, vi } from 'vitest'
import { success, failure } from '@/shared/result'
import { some, none } from '@/shared/maybe'
import type { RawEiaEnvelope } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'
import { cond } from '@/shared/fp'
import type { EiaClient } from '@/application/ports/eia-client'
import { buildLiveWeekly } from '@/application/workflows/live-weekly'
import type { LiveWeeklyCommand } from '@/application/commands/live-weekly-command'

vi.mock('@/contexts/measurement/workflows/measurement-input-workflow', () => ({
  default: () => failure({ kind: 'BuilderError', message: 'forced failure from mock' }),
}))

describe('live-weekly application workflow - measurement failure mapping', () => {
  it('maps measurement failures to MeasurementFailure application error', async () => {
    const inventoryEnvelope: RawEiaEnvelope = {
      api: none(),
      request: none(),
      response: none(),
      data: some([
        { period: some('2026-01-09'), date: none(), value: some('836125'), unit: some('MBBL'), series_id: some('WCRSTUS1'), series: none(), product: none(), geography: none(), frequency: some('weekly'), description: none(), notes: none() },
      ]),
      endpoint: some('/v2/petroleum/stoc/wstk/data/'),
      received_at: none(),
    }

    const priceEnvelope: RawEiaEnvelope = {
      api: none(),
      request: none(),
      response: none(),
      data: some([
        { period: some('2026-01-09'), date: none(), value: some('76.31'), unit: some('USD/bbl'), series_id: some('EPCWTIR'), series: none(), product: none(), geography: none(), frequency: some('weekly'), description: none(), notes: none() },
      ]),
      endpoint: some('/v2/petroleum/pri/spt/data/'),
      received_at: none(),
    }

    const defaultEnvelope = { api: none(), request: none(), response: none(), data: some([]), endpoint: none(), received_at: none() }

    const choose = cond([
      [(r: { endpoint: string }) => String(r.endpoint).includes('stoc'), () => success(inventoryEnvelope)],
      [(r: { endpoint: string }) => String(r.endpoint).includes('pri'), () => success(priceEnvelope)],
      [() => true, () => success(defaultEnvelope)],
    ])

    const fakeEiaClient: EiaClient = { loadRows: (req) => Promise.resolve(choose(req)) }

    const runner = buildLiveWeekly({ eiaClient: fakeEiaClient })

    const cmd: LiveWeeklyCommand = { reportWeekIso: '2026-01-09' }

    const result = await runner(cmd)

    expect(Reflect.get(result, 'ok')).toBe(false)
    const json = JSON.parse(JSON.stringify(result))
    expect(json.error.kind).toBe('MeasurementFailure')
  })
})
