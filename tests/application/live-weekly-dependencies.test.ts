import { describe, expect, it } from 'vitest'
import { createLiveWeeklyDependencies } from '@/application/dependencies/live-weekly-dependencies'
import { successClientFor } from '@/application/ports/fake-eia-client'
import { none, some } from '@/shared/maybe'
import type { RawEiaEnvelope } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'

describe('live-weekly dependencies', () => {
  it('preserves injected runtime ports', () => {
    const envelope: RawEiaEnvelope = {
      api: none(),
      request: none(),
      response: none(),
      data: some([]),
      endpoint: some('/v2/petroleum/stoc/wstk/data/'),
      received_at: none(),
    }

    const eiaClient = successClientFor(() => envelope)

    const dependencies = createLiveWeeklyDependencies({ eiaClient })

    expect(dependencies.eiaClient).toBe(eiaClient)
  })
})