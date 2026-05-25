import { describe, expect, it } from 'vitest'

import { parseGeographyScope, parseInventoryProduct, parseMeasurementKind, parseMeasurementUnit, parsePetroleumSlice, parsePriceKind, parseReportWeek, parseComparisonWindow, parseTrendDirection } from '@/contexts/measurement/model'
import { createInventorySignalIdentity, createPriceSignalIdentity, createHistoricalObservation, createInventorySignal, createPriceSignal, createCoreWeeklyInterpretationPolicies, calculateOneWeekTrend } from '@/contexts/interpretation'
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

describe('One-week trend calculation', () => {
  it('classifies inventory and price movement as up, down, or flat', () => {
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const inventoryProduct = unwrapSuccess(parseInventoryProduct('CrudeOil'))
    const inventoryKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
    const inventorySlice = unwrapSuccess(parsePetroleumSlice('Inventory'))
    const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
    const priceMeasurementKind = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
    const priceSlice = unwrapSuccess(parsePetroleumSlice('Price'))
    const inventoryUnit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))
    const priceUnit = unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const previousWeek = unwrapSuccess(parseReportWeek('2026-05-12T00:00:00.000Z'))
    const comparisonWindow = unwrapSuccess(parseComparisonWindow('OneWeek'))
    const upDirection = unwrapSuccess(parseTrendDirection('Up'))
    const downDirection = unwrapSuccess(parseTrendDirection('Down'))
    const flatDirection = unwrapSuccess(parseTrendDirection('Flat'))

    const inventoryIdentity = createInventorySignalIdentity(geography, inventoryKind, inventorySlice, inventoryProduct)
    const priceIdentity = createPriceSignalIdentity(geography, priceMeasurementKind, priceSlice, priceKind)

    const inventorySignal = createInventorySignal(inventoryIdentity, reportWeek, geography, 120, inventoryUnit, inventorySlice)
    const inventoryPrev = createHistoricalObservation(inventoryIdentity, previousWeek, 100, inventoryUnit)
    const priceSignal = createPriceSignal(priceIdentity, reportWeek, geography, 72, priceUnit, priceSlice)
    const pricePrev = createHistoricalObservation(priceIdentity, previousWeek, 75, priceUnit)

    const policies = createCoreWeeklyInterpretationPolicies(comparisonWindow, 5, 1)

    expect(unwrapSuccess(calculateOneWeekTrend(inventorySignal, inventoryPrev, policies)).direction).toEqual(upDirection)
    expect(unwrapSuccess(calculateOneWeekTrend(priceSignal, pricePrev, policies)).direction).toEqual(downDirection)

    const inventoryFlatSignal = createInventorySignal(inventoryIdentity, reportWeek, geography, 103, inventoryUnit, inventorySlice)
    const priceFlatSignal = createPriceSignal(priceIdentity, reportWeek, geography, 74.5, priceUnit, priceSlice)

    expect(unwrapSuccess(calculateOneWeekTrend(inventoryFlatSignal, inventoryPrev, policies)).direction).toEqual(flatDirection)
    expect(unwrapSuccess(calculateOneWeekTrend(priceFlatSignal, pricePrev, policies)).direction).toEqual(flatDirection)
  })
})
