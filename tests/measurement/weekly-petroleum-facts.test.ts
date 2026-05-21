import { describe, expect, it } from 'vitest'

import { parseReportWeek } from '@/contexts/measurement/model'
import { parseGeographyScope } from '@/contexts/measurement/model'
import { parseInventoryProduct } from '@/contexts/measurement/model'
import { parsePriceKind } from '@/contexts/measurement/model'
import { parsePetroleumSlice } from '@/contexts/measurement/model'
import { parseMeasurementKind } from '@/contexts/measurement/model'
import { parseDecimal } from '@/shared/decimal'
import { parseMeasurementUnit } from '@/contexts/measurement/model'
import { none } from '@/shared/maybe'
import { createWeeklyFact } from '@/contexts/measurement/model/weekly-fact'
import { createInventoryMeasurement } from '@/contexts/measurement/model/inventory-measurement'
import { createPriceMeasurement } from '@/contexts/measurement/model/price-measurement'
import { assembleWeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'

import { ifElse } from '@/shared/fp'
import type { Result } from '@/shared/result'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate: Result<SuccessValue, FailureValue>): SuccessValue => Reflect.get(candidate, 'value'),
    (): SuccessValue => {
      throw new Error('expected success')
    },
  )(result)

describe('WeeklyPetroleumFacts assembly', () => {
  it('assembles coherent inventory and price measurements', () => {
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))

    const product = unwrapSuccess(parseInventoryProduct('CrudeOil'))
    const invSlice = unwrapSuccess(parsePetroleumSlice('Inventory'))
    const invKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
    const invValue = unwrapSuccess(parseDecimal('123'))
    const invUnit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))
    const invFact = createWeeklyFact(reportWeek, geography, invSlice, invKind, invValue, invUnit, none())
    const inv = createInventoryMeasurement(product, invFact)

    const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
    const priceSlice = unwrapSuccess(parsePetroleumSlice('Price'))
    const priceKindFact = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
    const priceValue = unwrapSuccess(parseDecimal('72'))
    const priceUnit = unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))
    const priceFact = createWeeklyFact(reportWeek, geography, priceSlice, priceKindFact, priceValue, priceUnit, none())
    const price = createPriceMeasurement(priceKind, priceFact)

    const assembled = assembleWeeklyPetroleumFacts([inv], [price])

    expect(assembled.ok).toBe(true)
  })

  it('fails when inventory missing', () => {
    const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const priceSlice = unwrapSuccess(parsePetroleumSlice('Price'))
    const priceKindFact = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
    const priceValue = unwrapSuccess(parseDecimal('72'))
    const priceUnit = unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))
    const priceFact = createWeeklyFact(reportWeek, geography, priceSlice, priceKindFact, priceValue, priceUnit, none())
    const price = createPriceMeasurement(priceKind, priceFact)

    const assembled = assembleWeeklyPetroleumFacts([], [price])

    expect(assembled.ok).toBe(false)
  })

  it('fails when price missing', () => {
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))

    const product = unwrapSuccess(parseInventoryProduct('CrudeOil'))
    const invSlice = unwrapSuccess(parsePetroleumSlice('Inventory'))
    const invKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
    const invValue = unwrapSuccess(parseDecimal('123'))
    const invUnit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))
    const invFact = createWeeklyFact(reportWeek, geography, invSlice, invKind, invValue, invUnit, none())
    const inv = createInventoryMeasurement(product, invFact)

    const assembled = assembleWeeklyPetroleumFacts([inv], [])

    expect(assembled.ok).toBe(false)
  })

  it('fails when report weeks misaligned', () => {
    const reportWeekA = unwrapSuccess(parseReportWeek('2026-05-12T00:00:00.000Z'))
    const reportWeekB = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))

    const product = unwrapSuccess(parseInventoryProduct('CrudeOil'))
    const invSlice = unwrapSuccess(parsePetroleumSlice('Inventory'))
    const invKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
    const invValue = unwrapSuccess(parseDecimal('123'))
    const invUnit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))
    const invFact = createWeeklyFact(reportWeekA, geography, invSlice, invKind, invValue, invUnit, none())
    const inv = createInventoryMeasurement(product, invFact)

    const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
    const priceSlice = unwrapSuccess(parsePetroleumSlice('Price'))
    const priceKindFact = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
    const priceValue = unwrapSuccess(parseDecimal('72'))
    const priceUnit = unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))
    const priceFact = createWeeklyFact(reportWeekB, geography, priceSlice, priceKindFact, priceValue, priceUnit, none())
    const price = createPriceMeasurement(priceKind, priceFact)

    const assembled = assembleWeeklyPetroleumFacts([inv], [price])

    expect(assembled.ok).toBe(false)
  })

  it('fails when geographies misaligned', () => {
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geographyA = unwrapSuccess(parseGeographyScope('USTotal'))
    const geographyB = unwrapSuccess(parseGeographyScope('Cushing'))

    const product = unwrapSuccess(parseInventoryProduct('CrudeOil'))
    const invSlice = unwrapSuccess(parsePetroleumSlice('Inventory'))
    const invKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
    const invValue = unwrapSuccess(parseDecimal('123'))
    const invUnit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))
    const invFact = createWeeklyFact(reportWeek, geographyA, invSlice, invKind, invValue, invUnit, none())
    const inv = createInventoryMeasurement(product, invFact)

    const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
    const priceSlice = unwrapSuccess(parsePetroleumSlice('Price'))
    const priceKindFact = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
    const priceValue = unwrapSuccess(parseDecimal('72'))
    const priceUnit = unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))
    const priceFact = createWeeklyFact(reportWeek, geographyB, priceSlice, priceKindFact, priceValue, priceUnit, none())
    const price = createPriceMeasurement(priceKind, priceFact)

    const assembled = assembleWeeklyPetroleumFacts([inv], [price])

    expect(assembled.ok).toBe(false)
  })

  it('fails on duplicate inventory observations', () => {
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))

    const product = unwrapSuccess(parseInventoryProduct('CrudeOil'))
    const invSlice = unwrapSuccess(parsePetroleumSlice('Inventory'))
    const invKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
    const invValue = unwrapSuccess(parseDecimal('123'))
    const invUnit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))
    const invFact = createWeeklyFact(reportWeek, geography, invSlice, invKind, invValue, invUnit, none())
    const invA = createInventoryMeasurement(product, invFact)
    const invB = createInventoryMeasurement(product, invFact)

    const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
    const priceSlice = unwrapSuccess(parsePetroleumSlice('Price'))
    const priceKindFact = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
    const priceValue = unwrapSuccess(parseDecimal('72'))
    const priceUnit = unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))
    const priceFact = createWeeklyFact(reportWeek, geography, priceSlice, priceKindFact, priceValue, priceUnit, none())
    const price = createPriceMeasurement(priceKind, priceFact)

    const assembled = assembleWeeklyPetroleumFacts([invA, invB], [price])

    expect(assembled.ok).toBe(false)
  })

  it('fails on duplicate price observations', () => {
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))

    const product = unwrapSuccess(parseInventoryProduct('CrudeOil'))
    const invSlice = unwrapSuccess(parsePetroleumSlice('Inventory'))
    const invKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
    const invValue = unwrapSuccess(parseDecimal('123'))
    const invUnit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))
    const invFact = createWeeklyFact(reportWeek, geography, invSlice, invKind, invValue, invUnit, none())
    const inv = createInventoryMeasurement(product, invFact)

    const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
    const priceSlice = unwrapSuccess(parsePetroleumSlice('Price'))
    const priceKindFact = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
    const priceValue = unwrapSuccess(parseDecimal('72'))
    const priceUnit = unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))
    const priceFact = createWeeklyFact(reportWeek, geography, priceSlice, priceKindFact, priceValue, priceUnit, none())
    const priceA = createPriceMeasurement(priceKind, priceFact)
    const priceB = createPriceMeasurement(priceKind, priceFact)

    const assembled = assembleWeeklyPetroleumFacts([inv], [priceA, priceB])

    expect(assembled.ok).toBe(false)
  })
})
