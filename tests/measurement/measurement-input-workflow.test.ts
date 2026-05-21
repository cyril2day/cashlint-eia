import { describe, it, expect } from 'vitest'
import { some, none } from '@/shared/maybe'
import { fromRawInventoryRow, fromRawPriceRow } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import processTrustedBoundaryMeasurements from '@/contexts/measurement/workflows/measurement-input-workflow'
import { isFailure, mapResult, success } from '@/shared/result'

describe('processTrustedBoundaryMeasurements', () => {
  it('builds WeeklyPetroleumFacts from trusted boundary input (success)', () => {
    const invRaw = {
      period: some('2026-01-09'),
      date: none(),
      value: some('836125'),
      unit: some('MBBL'),
      series_id: some('WCRSTUS1'),
      series: none(),
      product: none(),
      geography: none(),
      frequency: none(),
      description: none(),
      notes: none(),
    }

    const priceRaw = {
      period: some('2026-01-09'),
      date: none(),
      value: some('76.31'),
      unit: some('USD/bbl'),
      series_id: some('EPCWTIR'),
      series: none(),
      product: none(),
      geography: none(),
      frequency: none(),
      description: none(),
      notes: none(),
    }

    const inv = fromRawInventoryRow(invRaw)
    const price = fromRawPriceRow(priceRaw)

    const r = processTrustedBoundaryMeasurements({ inputs: [inv, price] })

    const mapped = mapResult(r, v => [v.length, v[0].inventories.length])

    expect(mapped).toEqual(success([1, 1]))
  })

  it('returns NormalizeError when period is missing', () => {
    const badInvRaw = {
      period: none(),
      date: none(),
      value: some('100'),
      unit: some('bbl'),
      series_id: some('INV1'),
      series: none(),
      product: none(),
      geography: none(),
      frequency: none(),
      description: none(),
      notes: none(),
    }

    const badInv = fromRawInventoryRow(badInvRaw)

    const r = processTrustedBoundaryMeasurements({ inputs: [badInv] })

    expect(isFailure(r)).toBe(true)
    const json = JSON.parse(JSON.stringify(r))
    expect(json.error.kind).toBe('NormalizeError')
  })

  it('returns BuilderError when price is missing for a week', () => {
    const invRaw = {
      period: some('2026-01-09'),
      date: none(),
      value: some('836125'),
      unit: some('MBBL'),
      series_id: some('WCRSTUS1'),
      series: none(),
      product: none(),
      geography: none(),
      frequency: none(),
      description: none(),
      notes: none(),
    }

    const inv = fromRawInventoryRow(invRaw)

    const r = processTrustedBoundaryMeasurements({ inputs: [inv] })

    expect(isFailure(r)).toBe(true)
    const json = JSON.parse(JSON.stringify(r))
    expect(json.error.kind).toBe('BuilderError')
  })
})
