import { describe, expect, it } from 'vitest'

import {
  assembleRefinerySet,
  assembleSupplySet,
  assembleWeeklyPetroleumFacts,
  assembleWeeklyPetroleumFactsWithPolicy,
  createInventoryMeasurement,
  createPriceMeasurement,
  createRefineryMeasurement,
  createSupplyMeasurement,
  fullFirstReleaseRequiredMeasurementPolicy,
  parseGeographyScope,
  parseInventoryProduct,
  parseMeasurementKind,
  parseMeasurementUnit,
  parsePetroleumSlice,
  parsePriceKind,
  parseReportWeek,
} from '@/contexts/measurement/model'
import { createWeeklyFact } from '@/contexts/measurement/model/weekly-fact'
import { ifElse } from '@/shared/fp'
import type { Result } from '@/shared/result'
import { parseDecimal } from '@/shared/decimal'
import { none, some } from '@/shared/maybe'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate: Result<SuccessValue, FailureValue>): SuccessValue => Reflect.get(candidate, 'value'),
    (): SuccessValue => {
      throw new Error('expected success')
    },
  )(result)

const buildInventory = () => {
  const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
  const geography = unwrapSuccess(parseGeographyScope('USTotal'))
  const product = unwrapSuccess(parseInventoryProduct('CrudeOil'))
  const slice = unwrapSuccess(parsePetroleumSlice('Inventory'))
  const kind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
  const fact = createWeeklyFact(reportWeek, geography, slice, kind, unwrapSuccess(parseDecimal('123')), unwrapSuccess(parseMeasurementUnit('ThousandBarrels')), none())

  return createInventoryMeasurement(product, fact)
}

const buildPrice = () => {
  const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
  const geography = unwrapSuccess(parseGeographyScope('USTotal'))
  const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
  const slice = unwrapSuccess(parsePetroleumSlice('Price'))
  const kind = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
  const fact = createWeeklyFact(reportWeek, geography, slice, kind, unwrapSuccess(parseDecimal('72')), unwrapSuccess(parseMeasurementUnit('USDPerBarrel')), none())

  return createPriceMeasurement(priceKind, fact)
}

const buildRefinerySet = () => {
  const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
  const geography = unwrapSuccess(parseGeographyScope('USTotal'))
  const slice = unwrapSuccess(parsePetroleumSlice('Refinery'))
  const kind = unwrapSuccess(parseMeasurementKind('RefineryNetInput'))
  const fact = createWeeklyFact(reportWeek, geography, slice, kind, unwrapSuccess(parseDecimal('16')), unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay')), none())

  return unwrapSuccess(assembleRefinerySet([createRefineryMeasurement(kind, fact)]))
}

const buildSupplySet = () => {
  const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
  const geography = unwrapSuccess(parseGeographyScope('USTotal'))
  const slice = unwrapSuccess(parsePetroleumSlice('Supply'))
  const productionKind = unwrapSuccess(parseMeasurementKind('DomesticProduction'))
  const importsKind = unwrapSuccess(parseMeasurementKind('Imports'))
  const exportsKind = unwrapSuccess(parseMeasurementKind('Exports'))
  const flowUnit = unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay'))
  const production = createSupplyMeasurement(productionKind, createWeeklyFact(reportWeek, geography, slice, productionKind, unwrapSuccess(parseDecimal('13')), flowUnit, none()))
  const imports = createSupplyMeasurement(importsKind, createWeeklyFact(reportWeek, geography, slice, importsKind, unwrapSuccess(parseDecimal('7')), flowUnit, none()))
  const exports = createSupplyMeasurement(exportsKind, createWeeklyFact(reportWeek, geography, slice, exportsKind, unwrapSuccess(parseDecimal('4')), flowUnit, none()))

  return unwrapSuccess(assembleSupplySet([production, imports, exports]))
}

describe('WeeklyPetroleumFacts full first-release assembly', () => {
  it('assembles inventory, refinery, supply, and price under full policy', () => {
    const assembled = assembleWeeklyPetroleumFactsWithPolicy({
      policy: fullFirstReleaseRequiredMeasurementPolicy,
      inventories: [buildInventory()],
      refinery: some(buildRefinerySet()),
      supply: some(buildSupplySet()),
      prices: [buildPrice()],
    })

    expect(assembled.ok).toBe(true)
    expect(unwrapSuccess(assembled).refinery.kind).toBe('Some')
    expect(unwrapSuccess(assembled).supply.kind).toBe('Some')
  })

  it('fails when full policy refinery data is missing', () => {
    const assembled = assembleWeeklyPetroleumFactsWithPolicy({
      policy: fullFirstReleaseRequiredMeasurementPolicy,
      inventories: [buildInventory()],
      refinery: none(),
      supply: some(buildSupplySet()),
      prices: [buildPrice()],
    })

    expect(assembled).toMatchObject({ ok: false, error: { kind: 'MissingRequiredMeasurement', missing: 'refinery' } })
  })

  it('keeps walking-skeleton assembly compatible without refinery and supply', () => {
    const assembled = assembleWeeklyPetroleumFacts([buildInventory()], [buildPrice()])

    expect(assembled.ok).toBe(true)
    expect(unwrapSuccess(assembled).refinery.kind).toBe('None')
    expect(unwrapSuccess(assembled).supply.kind).toBe('None')
  })
})
