import { describe, expect, it } from 'vitest'

import { inventoryValidEnvelope } from './fixtures/eia/stoc-wstk/inventory-valid'
import { translateInventoryEnvelope, translateInventoryRow } from '@/contexts/acl/eia-ingestion-acl/translators'
import { none, some } from '@/shared/maybe'
import { failure, success } from '@/shared/result'
import type { RawEiaRow } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'

describe('inventory translator', () => {
  it('translates a sanitized inventory fixture into boundary input', () => {
    expect(translateInventoryEnvelope(inventoryValidEnvelope)).toEqual(
      success([
        {
          kind: 'Inventory',
          periodCandidate: some('2026-01-09'),
          seriesId: some('WCRSTUS1'),
          valueCandidate: some('836125'),
          unitCandidate: some('MBBL'),
          source: { endpoint: '/v2/petroleum/stoc/wstk/data/' },
        },
      ]),
    )
  })

  it('accepts numeric inventory value candidates', () => {
    const row: RawEiaRow = {
      period: some('2026-01-09'),
      date: some('2026-01-09'),
      value: some(836125),
      unit: some('MBBL'),
      series_id: some('WCRSTUS1'),
      series: some('WCRSTUS1'),
      product: some('CrudeOil'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('numeric value fixture'),
      notes: some('sanitized fixture'),
    }

    expect(translateInventoryRow(row)).toEqual(
      success({
        kind: 'Inventory',
        periodCandidate: some('2026-01-09'),
        seriesId: some('WCRSTUS1'),
        valueCandidate: some(836125),
        unitCandidate: some('MBBL'),
        source: { endpoint: '/v2/petroleum/stoc/wstk/data/' },
      }),
    )
  })

  it('rejects unsupported inventory series', () => {
    const row: RawEiaRow = {
      period: some('2026-01-09'),
      date: some('2026-01-09'),
      value: some('836125'),
      unit: some('MBBL'),
      series_id: some('NOT_SUPPORTED'),
      series: some('NOT_SUPPORTED'),
      product: some('CrudeOil'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('unsupported fixture'),
      notes: some('sanitized fixture'),
    }

    expect(translateInventoryRow(row)).toEqual(
      failure({
        kind: 'UnsupportedSeries',
        endpoint: some('/v2/petroleum/stoc/wstk/data/'),
        endpointFamily: none(),
        seriesId: some('NOT_SUPPORTED'),
        fieldName: none(),
        rawValue: some('NOT_SUPPORTED'),
        message: 'unsupported EIA series identifier',
      }),
    )
  })

  it('rejects malformed numeric and period candidates', () => {
    const invalidValueRow: RawEiaRow = {
      period: some('2026-01-09'),
      date: some('2026-01-09'),
      value: some('not-a-number'),
      unit: some('MBBL'),
      series_id: some('WCRSTUS1'),
      series: some('WCRSTUS1'),
      product: some('CrudeOil'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('invalid numeric fixture'),
      notes: some('sanitized fixture'),
    }

    expect(translateInventoryRow(invalidValueRow)).toEqual(
      failure({
        kind: 'InvalidNumericValue',
        endpoint: some('/v2/petroleum/stoc/wstk/data/'),
        endpointFamily: none(),
        seriesId: some('WCRSTUS1'),
        fieldName: some('value'),
        rawValue: some('not-a-number'),
        message: 'invalid numeric value in field: value',
      }),
    )

    const invalidPeriodRow: RawEiaRow = {
      period: some('2026/01/09'),
      date: some('2026-01-09'),
      value: some('836125'),
      unit: some('MBBL'),
      series_id: some('WCRSTUS1'),
      series: some('WCRSTUS1'),
      product: some('CrudeOil'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('invalid period fixture'),
      notes: some('sanitized fixture'),
    }

    expect(translateInventoryRow(invalidPeriodRow)).toEqual(
      failure({
        kind: 'InvalidDateOrPeriod',
        endpoint: some('/v2/petroleum/stoc/wstk/data/'),
        endpointFamily: none(),
        seriesId: some('WCRSTUS1'),
        fieldName: some('period'),
        rawValue: some('2026/01/09'),
        message: 'invalid date or period in field: period',
      }),
    )
  })

  it('rejects invalid inventory units and missing required fields', () => {
    const invalidUnitRow: RawEiaRow = {
      period: some('2026-01-09'),
      date: some('2026-01-09'),
      value: some('836125'),
      unit: some('BARRELS'),
      series_id: some('WCRSTUS1'),
      series: some('WCRSTUS1'),
      product: some('CrudeOil'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('invalid unit fixture'),
      notes: some('sanitized fixture'),
    }

    expect(translateInventoryRow(invalidUnitRow)).toEqual(
      failure({
        kind: 'InvalidUnit',
        endpoint: some('/v2/petroleum/stoc/wstk/data/'),
        endpointFamily: none(),
        seriesId: some('WCRSTUS1'),
        fieldName: some('unit'),
        rawValue: some('BARRELS'),
        message: 'invalid unit in field: unit',
      }),
    )

    const missingSeriesRow: RawEiaRow = {
      period: some('2026-01-09'),
      date: some('2026-01-09'),
      value: some('836125'),
      unit: some('MBBL'),
      series_id: { kind: 'None' },
      series: { kind: 'None' },
      product: some('CrudeOil'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('missing series fixture'),
      notes: some('sanitized fixture'),
    }

    expect(translateInventoryRow(missingSeriesRow)).toEqual(
      failure({
        kind: 'MissingRequiredField',
        endpoint: some('/v2/petroleum/stoc/wstk/data/'),
        endpointFamily: none(),
        seriesId: none(),
        fieldName: some('series'),
        rawValue: none(),
        message: 'missing required field: series',
      }),
    )
  })
})