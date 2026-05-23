import { describe, expect, it } from 'vitest'

import { contextualizeFullSignalSet, contextualizeWalkingSkeletonSignalSet, createWalkingSkeletonInterpretationPolicies, buildPreviousObservationMap } from '@/contexts/interpretation'
import { parseComparisonWindow, parseGeographyScope, parseInventoryProduct, parseMeasurementKind, parseMeasurementUnit, parsePetroleumSlice, parsePriceKind, parseReportWeek } from '@/contexts/measurement/model'
import { createHistoricalObservation, createHistoricalSeries, createInventorySignal, createInventorySignalIdentity, createPriceSignal, createPriceSignalIdentity } from '@/contexts/interpretation'
import { ifElse } from '@/shared/fp'
import type { Result } from '@/shared/result'

const assertSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate) => candidate.value,
    () => {
      throw new Error('expected success')
    },
  )(result)

describe('Interpretation public exports', () => {
  it('exposes the walking-skeleton interpretation surface', () => {
    const comparisonWindow = assertSuccess(parseComparisonWindow('OneWeek'))
    expect(typeof contextualizeWalkingSkeletonSignalSet).toBe('function')
    expect(typeof createWalkingSkeletonInterpretationPolicies).toBe('function')
    expect(typeof buildPreviousObservationMap).toBe('function')
    expect(comparisonWindow).toBeDefined()

    const geography = assertSuccess(parseGeographyScope('USTotal'))
    const inventoryProduct = assertSuccess(parseInventoryProduct('CrudeOil'))
    const inventoryKind = assertSuccess(parseMeasurementKind('CrudeStocks'))
    const inventorySlice = assertSuccess(parsePetroleumSlice('Inventory'))
    const priceKind = assertSuccess(parsePriceKind('WTISpot'))
    const priceMeasurementKind = assertSuccess(parseMeasurementKind('WTISpotPrice'))
    const priceSlice = assertSuccess(parsePetroleumSlice('Price'))
    const inventoryUnit = assertSuccess(parseMeasurementUnit('ThousandBarrels'))
    const priceUnit = assertSuccess(parseMeasurementUnit('USDPerBarrel'))
    const reportWeek = assertSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))

    const inventoryIdentity = createInventorySignalIdentity(geography, inventoryKind, inventorySlice, inventoryProduct)
    const priceIdentity = createPriceSignalIdentity(geography, priceMeasurementKind, priceSlice, priceKind)

    const inventorySignal = createInventorySignal(inventoryIdentity, reportWeek, geography, 120, inventoryUnit, inventorySlice)
    const priceSignal = createPriceSignal(priceIdentity, reportWeek, geography, 72, priceUnit, priceSlice)
    const previousObservations = buildPreviousObservationMap([
      createHistoricalObservation(inventoryIdentity, reportWeek, 100, inventoryUnit),
      createHistoricalObservation(priceIdentity, reportWeek, 75, priceUnit),
    ])
    const historicalSeries = {
      inventory: createHistoricalSeries(inventoryIdentity, inventoryUnit, [createHistoricalObservation(inventoryIdentity, reportWeek, 100, inventoryUnit)]),
      price: createHistoricalSeries(priceIdentity, priceUnit, [createHistoricalObservation(priceIdentity, reportWeek, 75, priceUnit)]),
    }

    expect(inventorySignal.identity.kind).toBe('Inventory')
    expect(priceSignal.identity.kind).toBe('Price')
    expect(previousObservations).toBeDefined()
    expect(typeof contextualizeFullSignalSet).toBe('function')
    expect(historicalSeries.inventory.identity.kind).toBe('Inventory')
  })
})
