import { describe, expect, it } from 'vitest'

import { priceValidEnvelope } from './fixtures/eia/pri-spt/price-valid'
import { translatePriceEnvelope, translatePriceRow } from '@/contexts/acl/eia-ingestion-acl/translators'
import { none, some } from '@/shared/maybe'
import { failure, success } from '@/shared/result'
import type { RawEiaRow } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'

describe('price translator', () => {
  it('translates a sanitized price fixture into boundary input', () => {
    expect(translatePriceEnvelope(priceValidEnvelope)).toEqual(
      success([
        {
          kind: 'Price',
          periodCandidate: some('2026-01-09'),
          seriesId: some('EPCWTIR'),
          measureKindCandidate: some('WTISpotPrice'),
          valueCandidate: some('76.31'),
          unitCandidate: some('USD/bbl'),
          source: { endpoint: '/v2/petroleum/pri/spt/data/' },
        },
      ]),
    )
  })

  it('accepts numeric price value candidates', () => {
    const row: RawEiaRow = {
      period: some('2026-01-09'),
      date: some('2026-01-09'),
      value: some(76.31),
      unit: some('USD/bbl'),
      series_id: some('EPCWTIR'),
      series: some('RWTC'),
      product: some('EPCWTIR'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('numeric value fixture'),
      notes: some('sanitized fixture'),
    }

    expect(translatePriceRow(row)).toEqual(
      success({
        kind: 'Price',
        periodCandidate: some('2026-01-09'),
        seriesId: some('EPCWTIR'),
        measureKindCandidate: some('WTISpotPrice'),
        valueCandidate: some(76.31),
        unitCandidate: some('USD/bbl'),
        source: { endpoint: '/v2/petroleum/pri/spt/data/' },
      }),
    )
  })

  it('accepts human-readable price units from the live API', () => {
    const row: RawEiaRow = {
      period: some('2026-01-09'),
      date: some('2026-01-09'),
      value: some('76.31'),
      unit: some('USD per Barrel'),
      series_id: some('EPCWTIR'),
      series: some('RWTC'),
      product: some('EPCWTIR'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('live unit fixture'),
      notes: some('sanitized fixture'),
    }

    expect(translatePriceRow(row)).toMatchObject({
      ok: true,
    })
  })

  it('accepts the live EIA WTI unit token', () => {
    const row: RawEiaRow = {
      period: some('2026-05-15'),
      date: some('2026-05-15'),
      value: some('105.1'),
      unit: some('$/BBL'),
      series_id: some('RWTC'),
      series: some('RWTC'),
      product: some('EPCWTI'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('live wti fixture'),
      notes: some('sanitized fixture'),
    }

    expect(translatePriceRow(row)).toMatchObject({
      ok: true,
    })
  })

  it('rejects unsupported price identifiers', () => {
    const row: RawEiaRow = {
      period: some('2026-01-09'),
      date: some('2026-01-09'),
      value: some('76.31'),
      unit: some('USD/bbl'),
      series_id: some('NOT_SUPPORTED'),
      series: some('NOT_SUPPORTED'),
      product: some('NOT_SUPPORTED'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('unsupported fixture'),
      notes: some('sanitized fixture'),
    }

    expect(translatePriceRow(row)).toEqual(
      failure({
        kind: 'UnsupportedSeries',
        endpoint: some('/v2/petroleum/pri/spt/data/'),
        endpointFamily: none(),
        seriesId: some('NOT_SUPPORTED'),
        fieldName: none(),
        rawValue: some('NOT_SUPPORTED'),
        message: 'unsupported EIA series identifier',
      }),
    )
  })

  it('rejects malformed numeric, period, and unit candidates', () => {
    const invalidValueRow: RawEiaRow = {
      period: some('2026-01-09'),
      date: some('2026-01-09'),
      value: some('not-a-number'),
      unit: some('USD/bbl'),
      series_id: some('EPCWTIR'),
      series: some('RWTC'),
      product: some('EPCWTIR'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('invalid numeric fixture'),
      notes: some('sanitized fixture'),
    }

    expect(translatePriceRow(invalidValueRow)).toEqual(
      failure({
        kind: 'InvalidNumericValue',
        endpoint: some('/v2/petroleum/pri/spt/data/'),
        endpointFamily: none(),
        seriesId: some('EPCWTIR'),
        fieldName: some('value'),
        rawValue: some('not-a-number'),
        message: 'invalid numeric value in field: value',
      }),
    )

    const invalidPeriodRow: RawEiaRow = {
      period: some('2026/01/09'),
      date: some('2026-01-09'),
      value: some('76.31'),
      unit: some('USD/bbl'),
      series_id: some('EPCWTIR'),
      series: some('RWTC'),
      product: some('EPCWTIR'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('invalid period fixture'),
      notes: some('sanitized fixture'),
    }

    expect(translatePriceRow(invalidPeriodRow)).toEqual(
      failure({
        kind: 'InvalidDateOrPeriod',
        endpoint: some('/v2/petroleum/pri/spt/data/'),
        endpointFamily: none(),
        seriesId: some('EPCWTIR'),
        fieldName: some('period'),
        rawValue: some('2026/01/09'),
        message: 'invalid date or period in field: period',
      }),
    )

    const invalidUnitRow: RawEiaRow = {
      period: some('2026-01-09'),
      date: some('2026-01-09'),
      value: some('76.31'),
      unit: some('BARRELS'),
      series_id: some('EPCWTIR'),
      series: some('RWTC'),
      product: some('EPCWTIR'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('invalid unit fixture'),
      notes: some('sanitized fixture'),
    }

    expect(translatePriceRow(invalidUnitRow)).toEqual(
      failure({
        kind: 'InvalidUnit',
        endpoint: some('/v2/petroleum/pri/spt/data/'),
        endpointFamily: none(),
        seriesId: some('EPCWTIR'),
        fieldName: some('unit'),
        rawValue: some('BARRELS'),
        message: 'invalid unit in field: unit',
      }),
    )
  })

  it('rejects missing required fields', () => {
    const missingSeriesRow: RawEiaRow = {
      period: some('2026-01-09'),
      date: some('2026-01-09'),
      value: some('76.31'),
      unit: some('USD/bbl'),
      series_id: { kind: 'None' },
      series: { kind: 'None' },
      product: { kind: 'None' },
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('missing series fixture'),
      notes: some('sanitized fixture'),
    }

    expect(translatePriceRow(missingSeriesRow)).toEqual(
      failure({
        kind: 'MissingRequiredField',
        endpoint: some('/v2/petroleum/pri/spt/data/'),
        endpointFamily: none(),
        seriesId: none(),
        fieldName: some('series'),
        rawValue: none(),
        message: 'missing required field: series',
      }),
    )
  })
})
