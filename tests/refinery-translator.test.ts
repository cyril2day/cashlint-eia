import { describe, expect, it } from 'vitest'

import { translateRefineryEnvelope, translateRefineryRow } from '@/contexts/acl/eia-ingestion-acl/translators'
import type { RawEiaEnvelope, RawEiaRow } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'
import { none, some } from '@/shared/maybe'
import { failure, success } from '@/shared/result'

const row = (seriesId: string, value: string, unit = 'MBBL/D'): RawEiaRow => ({
  period: some('2026-01-09'),
  date: some('2026-01-09'),
  value: some(value),
  unit: some(unit),
  series_id: none(),
  series: some(seriesId),
  product: some('CrudeOil'),
  geography: some('U.S.'),
  frequency: some('weekly'),
  description: some('sanitized refinery fixture'),
  notes: none(),
})

describe('refinery translator', () => {
  it('translates supported live refinery rows into boundary input', () => {
    const envelope: RawEiaEnvelope = {
      api: none(),
      request: none(),
      response: none(),
      data: some([
        row('WCRRIUS2', '16958'),
        row('WGIRIUS2', '17300'),
        row('WOCLEUS2', '18162'),
        row('WPULEUS3', '92.1', '%'),
      ]),
      endpoint: some('/v2/petroleum/pnp/wiup/data/'),
      received_at: none(),
    }

    expect(translateRefineryEnvelope(envelope)).toEqual(
      success([
        expect.objectContaining({ kind: 'Refinery', seriesId: some('WCRRIUS2'), measureKindCandidate: some('RefineryNetInput') }),
        expect.objectContaining({ kind: 'Refinery', seriesId: some('WGIRIUS2'), measureKindCandidate: some('RefineryGrossInput') }),
        expect.objectContaining({ kind: 'Refinery', seriesId: some('WOCLEUS2'), measureKindCandidate: some('RefineryOperableCapacity') }),
        expect.objectContaining({ kind: 'Refinery', seriesId: some('WPULEUS3'), measureKindCandidate: some('RefineryUtilization') }),
      ]),
    )
  })

  it('rejects unsupported refinery series', () => {
    expect(translateRefineryRow(row('NOT_SUPPORTED', '1'))).toEqual(
      failure({
        kind: 'UnsupportedSeries',
        endpoint: some('/v2/petroleum/pnp/wiup/data/'),
        endpointFamily: none(),
        seriesId: some('NOT_SUPPORTED'),
        fieldName: none(),
        rawValue: some('NOT_SUPPORTED'),
        message: 'unsupported EIA series identifier',
      }),
    )
  })
})
