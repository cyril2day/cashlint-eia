import { describe, expect, it } from 'vitest'

import { translateSupplyEnvelope, translateSupplyRow } from '@/contexts/acl/eia-ingestion-acl/translators'
import type { RawEiaEnvelope, RawEiaRow } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'
import { none, some } from '@/shared/maybe'
import { failure, success } from '@/shared/result'

const row = (seriesId: string, value: string): RawEiaRow => ({
  period: some('2026-01-09'),
  date: some('2026-01-09'),
  value: some(value),
  unit: some('MBBL/D'),
  series_id: none(),
  series: some(seriesId),
  product: some('CrudeOil'),
  geography: some('U.S.'),
  frequency: some('weekly'),
  description: some('sanitized supply fixture'),
  notes: none(),
})

describe('supply translator', () => {
  it('translates supported live supply rows into boundary input', () => {
    const envelope: RawEiaEnvelope = {
      api: none(),
      request: none(),
      response: none(),
      data: some([
        row('WCRFPUS2', '13000'),
        row('WCRIMUS2', '7000'),
        row('WCREXUS2', '4000'),
      ]),
      endpoint: some('/v2/petroleum/sum/sndw/data/'),
      received_at: none(),
    }

    expect(translateSupplyEnvelope(envelope)).toEqual(
      success([
        expect.objectContaining({ kind: 'Supply', seriesId: some('WCRFPUS2'), measureKindCandidate: some('DomesticProduction') }),
        expect.objectContaining({ kind: 'Supply', seriesId: some('WCRIMUS2'), measureKindCandidate: some('Imports') }),
        expect.objectContaining({ kind: 'Supply', seriesId: some('WCREXUS2'), measureKindCandidate: some('Exports') }),
      ]),
    )
  })

  it('rejects unsupported supply series', () => {
    expect(translateSupplyRow(row('NOT_SUPPORTED', '1'))).toEqual(
      failure({
        kind: 'UnsupportedSeries',
        endpoint: some('/v2/petroleum/sum/sndw/data/'),
        endpointFamily: none(),
        seriesId: some('NOT_SUPPORTED'),
        fieldName: none(),
        rawValue: some('NOT_SUPPORTED'),
        message: 'unsupported EIA series identifier',
      }),
    )
  })
})
