import { describe, expect, it } from 'vitest'

import {
  composeFullWeeklyAnalysis,
  createFullAnalysisPolicies,
} from '@/contexts/analysis'
import { composeSystemBalanceAnalysis, defaultSystemBalancePolicy, type SystemBalanceAnalysis } from '@/contexts/system-balance'
import {
  assembleRefinerySet,
  assembleSupplySet,
  assembleWeeklyPetroleumFactsWithPolicy,
  createInventoryMeasurement,
  createPriceMeasurement,
  createRefineryMeasurement,
  createSupplyMeasurement,
  fullFirstReleaseRequiredMeasurementPolicy,
  parseGeographyScope,
  parseComparisonWindow,
  parseInventoryProduct,
  parseMeasurementKind,
  parseMeasurementUnit,
  parsePetroleumSlice,
  parsePriceKind,
  parseReportWeek,
  type MeasurementUnitLabel,
  type WeeklyPetroleumFacts,
} from '@/contexts/measurement/model'
import { createWeeklyFact } from '@/contexts/measurement/model/weekly-fact'
import {
  contextualizeFullSignal,
  createHistoricalObservation,
  createHistoricalSeries,
  createInventorySignal,
  createInventorySignalIdentity,
  createPriceSignal,
  createPriceSignalIdentity,
  createCoreWeeklyInterpretationPolicies,
} from '@/contexts/interpretation'
import { parseDecimal } from '@/shared/decimal'
import { ifElse } from '@/shared/fp'
import { none, some } from '@/shared/maybe'
import type { Result } from '@/shared/result'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate: Result<SuccessValue, FailureValue>): SuccessValue => Reflect.get(candidate, 'value'),
    (): SuccessValue => {
      throw new Error('expected success')
    },
  )(result)

const reportWeek = (value: string) => unwrapSuccess(parseReportWeek(value))
const geography = () => unwrapSuccess(parseGeographyScope('USTotal'))
const inventoryProduct = () => unwrapSuccess(parseInventoryProduct('CrudeOil'))
const inventoryKind = () => unwrapSuccess(parseMeasurementKind('CrudeStocks'))
const inventorySlice = () => unwrapSuccess(parsePetroleumSlice('Inventory'))
const priceKind = () => unwrapSuccess(parsePriceKind('WTISpot'))
const priceMeasurementKind = () => unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
const priceSlice = () => unwrapSuccess(parsePetroleumSlice('Price'))
const inventoryUnit = () => unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))
const priceUnit = () => unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))
const flowUnit = (label: MeasurementUnitLabel) => unwrapSuccess(parseMeasurementUnit(label))

const buildInventoryMeasurement = (weekValue: string, value: number) =>
  createInventoryMeasurement(
    inventoryProduct(),
    createWeeklyFact(reportWeek(weekValue), geography(), inventorySlice(), inventoryKind(), unwrapSuccess(parseDecimal(String(value))), inventoryUnit(), none()),
  )

const buildPriceMeasurement = (weekValue: string, value: number) =>
  createPriceMeasurement(
    priceKind(),
    createWeeklyFact(reportWeek(weekValue), geography(), priceSlice(), priceMeasurementKind(), unwrapSuccess(parseDecimal(String(value))), priceUnit(), none()),
  )

const buildRefinerySet = (weekValue: string, value: number) =>
  unwrapSuccess(assembleRefinerySet([
    createRefineryMeasurement(
      unwrapSuccess(parseMeasurementKind('RefineryNetInput')),
      createWeeklyFact(reportWeek(weekValue), geography(), unwrapSuccess(parsePetroleumSlice('Refinery')), unwrapSuccess(parseMeasurementKind('RefineryNetInput')), unwrapSuccess(parseDecimal(String(value))), flowUnit('ThousandBarrelsPerDay'), none()),
    ),
  ]))

const buildSupplySet = (weekValue: string, productionValue: number, importsValue: number, exportsValue: number) => {
  const supplyUnit = flowUnit('ThousandBarrelsPerDay')
  const slice = unwrapSuccess(parsePetroleumSlice('Supply'))
  const productionKind = unwrapSuccess(parseMeasurementKind('DomesticProduction'))
  const importsKind = unwrapSuccess(parseMeasurementKind('Imports'))
  const exportsKind = unwrapSuccess(parseMeasurementKind('Exports'))

  return unwrapSuccess(assembleSupplySet([
    createSupplyMeasurement(productionKind, createWeeklyFact(reportWeek(weekValue), geography(), slice, productionKind, unwrapSuccess(parseDecimal(String(productionValue))), supplyUnit, none())),
    createSupplyMeasurement(importsKind, createWeeklyFact(reportWeek(weekValue), geography(), slice, importsKind, unwrapSuccess(parseDecimal(String(importsValue))), supplyUnit, none())),
    createSupplyMeasurement(exportsKind, createWeeklyFact(reportWeek(weekValue), geography(), slice, exportsKind, unwrapSuccess(parseDecimal(String(exportsValue))), supplyUnit, none())),
  ]))
}

const buildFacts = (
  weekValue: string,
  inventoryValue: number,
  productionValue: number,
  importsValue: number,
  exportsValue: number,
  refineryInput: number,
): WeeklyPetroleumFacts =>
  unwrapSuccess(assembleWeeklyPetroleumFactsWithPolicy({
    policy: fullFirstReleaseRequiredMeasurementPolicy,
    inventories: [buildInventoryMeasurement(weekValue, inventoryValue)],
    refinery: some(buildRefinerySet(weekValue, refineryInput)),
    supply: some(buildSupplySet(weekValue, productionValue, importsValue, exportsValue)),
    prices: [buildPriceMeasurement(weekValue, 72)],
  }))

const currentFacts = () => buildFacts('2026-05-19T00:00:00.000Z', 95, 10, 4, 1, 16)
const previousFacts = () => buildFacts('2026-05-12T00:00:00.000Z', 100, 9, 3, 2, 15)

const analysisBalance = (): SystemBalanceAnalysis =>
  unwrapSuccess(composeSystemBalanceAnalysis(some(currentFacts()), some(previousFacts()), defaultSystemBalancePolicy))

const inventoryIdentity = () =>
  createInventorySignalIdentity(geography(), inventoryKind(), inventorySlice(), inventoryProduct())

const priceIdentity = () =>
  createPriceSignalIdentity(geography(), priceMeasurementKind(), priceSlice(), priceKind())

const inventorySignal = (value: number) =>
  createInventorySignal(inventoryIdentity(), reportWeek('2026-05-19T00:00:00.000Z'), geography(), value, inventoryUnit(), inventorySlice())

const priceSignal = (value: number) =>
  createPriceSignal(priceIdentity(), reportWeek('2026-05-19T00:00:00.000Z'), geography(), value, priceUnit(), priceSlice())

const inventoryHistory = (values: readonly number[]) =>
  createHistoricalSeries(inventoryIdentity(), inventoryUnit(), [
    createHistoricalObservation(inventoryIdentity(), reportWeek('2026-05-12T00:00:00.000Z'), values[0], inventoryUnit()),
    createHistoricalObservation(inventoryIdentity(), reportWeek('2026-05-05T00:00:00.000Z'), values[1], inventoryUnit()),
  ])

const priceHistory = (values: readonly number[]) =>
  createHistoricalSeries(priceIdentity(), priceUnit(), [
    createHistoricalObservation(priceIdentity(), reportWeek('2026-05-12T00:00:00.000Z'), values[0], priceUnit()),
    createHistoricalObservation(priceIdentity(), reportWeek('2026-05-05T00:00:00.000Z'), values[1], priceUnit()),
  ])

const contextualizedSignals = (inventoryValues: readonly number[], priceValues: readonly number[]) => ({
  inventory: unwrapSuccess(contextualizeFullSignal(inventorySignal(95), inventoryHistory(inventoryValues), createCoreWeeklyInterpretationPolicies(unwrapSuccess(parseComparisonWindow('OneWeek')), 5, 1))),
  price: unwrapSuccess(contextualizeFullSignal(priceSignal(72), priceHistory(priceValues), createCoreWeeklyInterpretationPolicies(unwrapSuccess(parseComparisonWindow('OneWeek')), 5, 1))),
})

describe('Full WeeklyAnalysis synthesis', () => {
  it('composes a full weekly analysis from system balance and contextualized signals', () => {
    const analysis = unwrapSuccess(
      composeFullWeeklyAnalysis(
        analysisBalance(),
        contextualizedSignals([100, 102], [70, 69]),
        createFullAnalysisPolicies(),
      ),
    )

    expect(analysis.condition.condition).toBe('Tightening')
    expect(analysis.keyDrivers.length).toBeGreaterThan(0)
    expect(analysis.historicalQualifications).toHaveLength(2)
    expect(analysis.supportingSignals.length).toBeGreaterThan(0)
    expect(analysis.contradictorySignals.length).toBe(0)
    expect(analysis.trace.kind).toBe('Some')
    expect(analysis.headline).toContain('condition rests')
    expect(analysis.summary).toContain('condition has support')
    expect(analysis.explanation).toContain('System balance')
  })

  it('labels conflicting evidence as mixed when the signals contradict the balance state', () => {
    const analysis = unwrapSuccess(
      composeFullWeeklyAnalysis(
        analysisBalance(),
        contextualizedSignals([80, 70], [74, 76]),
        createFullAnalysisPolicies(),
      ),
    )

    expect(analysis.condition.condition).toBe('Mixed')
    expect(analysis.contradictorySignals.length).toBeGreaterThan(0)
  })
})
