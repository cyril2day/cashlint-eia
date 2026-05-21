import { describe, expect, it } from 'vitest'

import { parseGeographyScope, parseInventoryProduct, parseMeasurementKind, parseMeasurementUnit, parsePetroleumSlice, parsePriceKind, parseReportWeek, parseComparisonWindow } from '@/contexts/measurement/model'
import { createInventorySignalIdentity, createPriceSignalIdentity, createHistoricalObservation, createInventorySignal, createPriceSignal, buildPreviousObservationMap, contextualizeSignal, contextualizeWalkingSkeletonSignalSet, createWalkingSkeletonInterpretationPolicies } from '@/contexts/interpretation'
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

const assertSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate) => candidate.value,
    () => {
      throw new Error('expected success')
    },
  )(result)

describe('Contextualized interpretation', () => {
  it('contextualizes the walking-skeleton signal set with one-week trend and NotComputed anomaly', () => {
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

    const inventoryIdentity = createInventorySignalIdentity(geography, inventoryKind, inventorySlice, inventoryProduct)
    const priceIdentity = createPriceSignalIdentity(geography, priceMeasurementKind, priceSlice, priceKind)

    const inventorySignal = createInventorySignal(inventoryIdentity, reportWeek, geography, 120, inventoryUnit, inventorySlice)
    const priceSignal = createPriceSignal(priceIdentity, reportWeek, geography, 72, priceUnit, priceSlice)

    const previousObservations = buildPreviousObservationMap([
      createHistoricalObservation(inventoryIdentity, previousWeek, 100, inventoryUnit),
      createHistoricalObservation(priceIdentity, previousWeek, 75, priceUnit),
    ])

    const policies = createWalkingSkeletonInterpretationPolicies(comparisonWindow, 5, 1)
    const contextualized = assertSuccess(contextualizeWalkingSkeletonSignalSet({ inventory: inventorySignal, price: priceSignal }, previousObservations, policies))

    expect(contextualized.inventory.anomaly.kind).toBe('NotComputed')
    expect(contextualized.price.anomaly.kind).toBe('NotComputed')
    expect(contextualized.inventory.trend.kind).toBe('Some')
    expect(contextualized.price.trend.kind).toBe('Some')
    expect(contextualized.inventory.caveats.some((c: { kind: string }) => c.kind === 'AnomalyNotComputed')).toBe(true)
  })

  it('allows missing previous observation when policy permits partial interpretation', () => {
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const inventoryProduct = unwrapSuccess(parseInventoryProduct('CrudeOil'))
    const inventoryKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
    const inventorySlice = unwrapSuccess(parsePetroleumSlice('Inventory'))
    const inventoryUnit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const comparisonWindow = unwrapSuccess(parseComparisonWindow('OneWeek'))

    const inventoryIdentity = createInventorySignalIdentity(geography, inventoryKind, inventorySlice, inventoryProduct)
    const inventorySignal = createInventorySignal(inventoryIdentity, reportWeek, geography, 120, inventoryUnit, inventorySlice)

    const contextualized = assertSuccess(
      contextualizeSignal(
        inventorySignal,
        buildPreviousObservationMap([]),
        createWalkingSkeletonInterpretationPolicies(comparisonWindow, 5, 1, true),
      ),
    )

    expect(contextualized.trend.kind).toBe('None')
    expect(contextualized.caveats.some((c: { kind: string }) => c.kind === 'MissingPreviousObservation')).toBe(true)
  })
})
