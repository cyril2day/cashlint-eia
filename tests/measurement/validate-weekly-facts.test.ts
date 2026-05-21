import { describe, expect, it } from 'vitest'

import { ifElse } from '@/shared/fp'
import type { Result } from '@/shared/result'
import { none } from '@/shared/maybe'
import { parseReportWeek } from '@/contexts/measurement/model'
import { parseGeographyScope } from '@/contexts/measurement/model'
import { parseInventoryProduct } from '@/contexts/measurement/model'
import { parsePriceKind } from '@/contexts/measurement/model'
import { parsePetroleumSlice } from '@/contexts/measurement/model'
import { parseMeasurementKind } from '@/contexts/measurement/model'
import { parseDecimal } from '@/shared/decimal'
import { parseMeasurementUnit } from '@/contexts/measurement/model'
import { createWeeklyFact } from '@/contexts/measurement/model/weekly-fact'
import { createInventoryMeasurement } from '@/contexts/measurement/model/inventory-measurement'
import { createPriceMeasurement } from '@/contexts/measurement/model/price-measurement'
import { assembleWeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import { validateWeeklyFacts } from '@/contexts/measurement/workflows/validate-weekly-facts'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate: Result<SuccessValue, FailureValue>): SuccessValue => Reflect.get(candidate, 'value'),
    (): SuccessValue => {
      throw new Error('expected success')
    },
  )(result)

const buildWeeklyFacts = () => {
  const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
  const geography = unwrapSuccess(parseGeographyScope('USTotal'))

  const product = unwrapSuccess(parseInventoryProduct('CrudeOil'))
  const invSlice = unwrapSuccess(parsePetroleumSlice('Inventory'))
  const invKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
  const invValue = unwrapSuccess(parseDecimal('123'))
  const invUnit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))
  const invFact = createWeeklyFact(reportWeek, geography, invSlice, invKind, invValue, invUnit, none())
  const inventory = createInventoryMeasurement(product, invFact)

  const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
  const priceSlice = unwrapSuccess(parsePetroleumSlice('Price'))
  const priceKindFact = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
  const priceValue = unwrapSuccess(parseDecimal('72'))
  const priceUnit = unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))
  const priceFact = createWeeklyFact(reportWeek, geography, priceSlice, priceKindFact, priceValue, priceUnit, none())
  const price = createPriceMeasurement(priceKind, priceFact)

  return unwrapSuccess(assembleWeeklyPetroleumFacts([inventory], [price]))
}

describe('validateWeeklyFacts', () => {
  it('returns the same weekly facts on success', () => {
    const facts = buildWeeklyFacts()

    const validated = validateWeeklyFacts(facts)

    expect(validated.ok).toBe(true)
    expect(validated).toMatchObject({ ok: true, value: facts })
  })

  it('fails when report week is missing', () => {
    const facts = buildWeeklyFacts()
    const invalid = Object.assign({}, facts, { reportWeek: undefined })

    const validated = validateWeeklyFacts(invalid)

    expect(validated.ok).toBe(false)
    expect(validated).toMatchObject({ ok: false, error: { kind: 'InvalidWeeklyPetroleumFactsInput' } })
  })

  it('fails when inventories are missing', () => {
    const facts = buildWeeklyFacts()
    const invalid = Object.assign({}, facts, { inventories: [] })

    const validated = validateWeeklyFacts(invalid)

    expect(validated.ok).toBe(false)
    expect(validated).toMatchObject({ ok: false, error: { kind: 'MissingRequiredMeasurement' } })
  })

  it('fails when geography differs from the assembled facts', () => {
    const facts = buildWeeklyFacts()
    const invalid = Object.assign({}, facts, { geography: unwrapSuccess(parseGeographyScope('Cushing')) })

    const validated = validateWeeklyFacts(invalid)

    expect(validated.ok).toBe(false)
    expect(validated).toMatchObject({ ok: false, error: { kind: 'GeographyMismatch' } })
  })
})