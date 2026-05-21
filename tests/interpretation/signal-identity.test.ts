import { describe, expect, it } from 'vitest'

import { parseGeographyScope, parseInventoryProduct, parseMeasurementKind, parsePetroleumSlice, parsePriceKind } from '@/contexts/measurement/model'
import { createInventorySignalIdentity, createPriceSignalIdentity, formatSignalIdentity } from '@/contexts/interpretation'
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

describe('SignalIdentity', () => {
  it('creates inventory and price identities that stay distinct', () => {
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const inventoryProduct = unwrapSuccess(parseInventoryProduct('CrudeOil'))
    const inventoryKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
    const inventorySlice = unwrapSuccess(parsePetroleumSlice('Inventory'))
    const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
    const priceMeasurementKind = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
    const priceSlice = unwrapSuccess(parsePetroleumSlice('Price'))

    const inventoryIdentity = createInventorySignalIdentity(geography, inventoryKind, inventorySlice, inventoryProduct)
    const priceIdentity = createPriceSignalIdentity(geography, priceMeasurementKind, priceSlice, priceKind)

    expect(formatSignalIdentity(inventoryIdentity)).not.toEqual(formatSignalIdentity(priceIdentity))
  })
})
