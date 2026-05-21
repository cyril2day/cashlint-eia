import { describe, expect, it } from 'vitest'

import { parseReportWeek, parseGeographyScope, parseInventoryProduct, parseMeasurementKind, parsePetroleumSlice, parsePriceKind, parseMeasurementUnit } from '@/contexts/measurement/model'
import { createWeeklyFact } from '@/contexts/measurement/model/weekly-fact'
import { createInventoryMeasurement } from '@/contexts/measurement/model/inventory-measurement'
import { createPriceMeasurement } from '@/contexts/measurement/model/price-measurement'
import { assembleWeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import { parseDecimal } from '@/shared/decimal'
import { none } from '@/shared/maybe'
import { ifElse } from '@/shared/fp'
import type { Result } from '@/shared/result'
import { extractCurrentSignalSet, extractInventorySignal, extractPriceSignal } from '@/contexts/interpretation'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate: Result<SuccessValue, FailureValue>): SuccessValue => Reflect.get(candidate, 'value'),
    (): SuccessValue => {
      throw new Error('expected success')
    },
  )(result)

const buildFacts = () => {
  const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
  const geography = unwrapSuccess(parseGeographyScope('USTotal'))

  const inventoryProduct = unwrapSuccess(parseInventoryProduct('CrudeOil'))
  const inventorySlice = unwrapSuccess(parsePetroleumSlice('Inventory'))
  const inventoryKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
  const inventoryValue = unwrapSuccess(parseDecimal('123'))
  const inventoryUnit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))
  const inventoryFact = createWeeklyFact(reportWeek, geography, inventorySlice, inventoryKind, inventoryValue, inventoryUnit, none())
  const inventory = createInventoryMeasurement(inventoryProduct, inventoryFact)

  const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
  const priceSlice = unwrapSuccess(parsePetroleumSlice('Price'))
  const priceMeasurementKind = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
  const priceValue = unwrapSuccess(parseDecimal('72'))
  const priceUnit = unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))
  const priceFact = createWeeklyFact(reportWeek, geography, priceSlice, priceMeasurementKind, priceValue, priceUnit, none())
  const price = createPriceMeasurement(priceKind, priceFact)

  return unwrapSuccess(assembleWeeklyPetroleumFacts([inventory], [price]))
}

const assertSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate) => candidate.value,
    () => {
      throw new Error('expected success')
    },
  )(result)

describe('Interpretation signal extraction', () => {
  it('extracts inventory and price signals from WeeklyPetroleumFacts', () => {
    const facts = buildFacts()

    const inventory = assertSuccess(extractInventorySignal(facts))
    const price = assertSuccess(extractPriceSignal(facts))
    const set = assertSuccess(extractCurrentSignalSet(facts))

    expect(inventory.identity.kind).toBe('Inventory')
    expect(price.identity.kind).toBe('Price')
    expect(set.inventory.identity.kind).toBe('Inventory')
    expect(set.price.identity.kind).toBe('Price')
    expect(set.inventory.value).toBe(inventory.value)
    expect(set.price.value).toBe(price.value)
  })
})
