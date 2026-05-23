import { describe, expect, it } from 'vitest'

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
  parseInventoryProduct,
  parseMeasurementKind,
  parseMeasurementUnit,
  parsePetroleumSlice,
  parsePriceKind,
  parseReportWeek,
  type InventoryMeasurement,
  type MeasurementUnitLabel,
  type WeeklyPetroleumFacts,
} from '@/contexts/measurement/model'
import { createWeeklyFact } from '@/contexts/measurement/model/weekly-fact'
import {
  assignBalanceConfidence,
  calculateAvailableSupply,
  calculateInventoryChange,
  calculateNetImports,
  calculateSupplyPressure,
  classifyBalanceState,
  composeSystemBalanceAnalysis,
  createBalanceCaveats,
  createSystemBalanceError,
  defaultSystemBalancePolicy,
  deriveRefineryDemand,
  identifyBalanceDrivers,
  type SystemBalanceAnalysis,
} from '@/contexts/system-balance'
import { parseDecimal } from '@/shared/decimal'
import { ifElse } from '@/shared/fp'
import { none, some } from '@/shared/maybe'
import type { Maybe } from '@/shared/maybe'
import type { Result } from '@/shared/result'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate: Result<SuccessValue, FailureValue>): SuccessValue => Reflect.get(candidate, 'value'),
    (): SuccessValue => {
      throw new Error('expected a successful result')
    },
  )(result)

const unwrapSome = <Value>(value: Maybe<Value>): Value =>
  ifElse(
    (candidate: Maybe<Value>) => candidate.kind === 'Some',
    (candidate: Maybe<Value>): Value => Reflect.get(candidate, 'value'),
    (): Value => {
      throw new Error('expected a present value')
    },
  )(value)

const week = (value: string) => unwrapSuccess(parseReportWeek(value))
const geography = () => unwrapSuccess(parseGeographyScope('USTotal'))
const unit = (value: MeasurementUnitLabel) => unwrapSuccess(parseMeasurementUnit(value))
const decimal = (value: number) => unwrapSuccess(parseDecimal(String(value)))

const inventory = (
  reportWeek: string,
  value: number,
  unitLabel: MeasurementUnitLabel = 'ThousandBarrels',
): InventoryMeasurement => {
  const product = unwrapSuccess(parseInventoryProduct('CrudeOil'))
  const slice = unwrapSuccess(parsePetroleumSlice('Inventory'))
  const kind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
  const fact = createWeeklyFact(week(reportWeek), geography(), slice, kind, decimal(value), unit(unitLabel), none())

  return createInventoryMeasurement(product, fact)
}

const price = (reportWeek: string) => {
  const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
  const slice = unwrapSuccess(parsePetroleumSlice('Price'))
  const kind = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
  const fact = createWeeklyFact(week(reportWeek), geography(), slice, kind, decimal(72), unit('USDPerBarrel'), none())

  return createPriceMeasurement(priceKind, fact)
}

const refinerySet = (
  reportWeek: string,
  refineryInput: number,
  unitLabel: MeasurementUnitLabel = 'ThousandBarrelsPerDay',
) => {
  const slice = unwrapSuccess(parsePetroleumSlice('Refinery'))
  const kind = unwrapSuccess(parseMeasurementKind('RefineryNetInput'))
  const fact = createWeeklyFact(week(reportWeek), geography(), slice, kind, decimal(refineryInput), unit(unitLabel), none())

  return unwrapSuccess(assembleRefinerySet([createRefineryMeasurement(kind, fact)]))
}

const supplySet = (
  reportWeek: string,
  productionValue: number,
  importsValue: number,
  exportsValue: number,
  unitLabel: MeasurementUnitLabel = 'ThousandBarrelsPerDay',
) => {
  const slice = unwrapSuccess(parsePetroleumSlice('Supply'))
  const productionKind = unwrapSuccess(parseMeasurementKind('DomesticProduction'))
  const importsKind = unwrapSuccess(parseMeasurementKind('Imports'))
  const exportsKind = unwrapSuccess(parseMeasurementKind('Exports'))
  const supplyUnit = unit(unitLabel)
  const production = createSupplyMeasurement(
    productionKind,
    createWeeklyFact(week(reportWeek), geography(), slice, productionKind, decimal(productionValue), supplyUnit, none()),
  )
  const imports = createSupplyMeasurement(
    importsKind,
    createWeeklyFact(week(reportWeek), geography(), slice, importsKind, decimal(importsValue), supplyUnit, none()),
  )
  const exportsValueMeasurement = createSupplyMeasurement(
    exportsKind,
    createWeeklyFact(week(reportWeek), geography(), slice, exportsKind, decimal(exportsValue), supplyUnit, none()),
  )

  return unwrapSuccess(assembleSupplySet([production, imports, exportsValueMeasurement]))
}

const facts = (
  reportWeek: string,
  inventoryValue: number,
  productionValue: number,
  importsValue: number,
  exportsValue: number,
  refineryInput: number,
): WeeklyPetroleumFacts =>
  unwrapSuccess(assembleWeeklyPetroleumFactsWithPolicy({
    policy: fullFirstReleaseRequiredMeasurementPolicy,
    inventories: [inventory(reportWeek, inventoryValue)],
    refinery: some(refinerySet(reportWeek, refineryInput)),
    supply: some(supplySet(reportWeek, productionValue, importsValue, exportsValue)),
    prices: [price(reportWeek)],
  }))

const currentTightening = () => facts('2026-05-19T00:00:00.000Z', 95, 10, 4, 1, 16)
const previousBase = () => facts('2026-05-12T00:00:00.000Z', 100, 9, 3, 2, 15)

describe('System Balance component calculations', () => {
  it('calculates net imports, available supply, refinery demand, inventory change, and supply pressure', () => {
    const current = currentTightening()
    const previous = previousBase()
    const currentSupply = unwrapSome(current.supply)
    const supply = unwrapSuccess(calculateNetImports(some(currentSupply.imports), some(currentSupply.exports)))
    const availableSupply = unwrapSuccess(calculateAvailableSupply(some(currentSupply.production), some(supply)))
    const refineryDemand = unwrapSuccess(deriveRefineryDemand(current.refinery))
    const inventoryChange = unwrapSuccess(calculateInventoryChange(some(current.inventories[0]), some(previous.inventories[0]), defaultSystemBalancePolicy))
    const supplyPressure = unwrapSuccess(calculateSupplyPressure(some(availableSupply), some(refineryDemand), defaultSystemBalancePolicy))

    expect(supply.value).toBe(3)
    expect(availableSupply.value).toBe(13)
    expect(refineryDemand.value).toBe(16)
    expect(inventoryChange.movement).toBe('StockDraw')
    expect(supplyPressure.pressure).toBe('TightnessPressure')
  })

  it('returns SystemBalanceError values for missing and incompatible calculation inputs', () => {
    const current = currentTightening()
    const badInventory = inventory('2026-05-12T00:00:00.000Z', 100, 'MillionBarrels')

    expect(calculateNetImports(none(), none())).toMatchObject({ ok: false, error: { kind: 'MissingImports' } })
    expect(calculateInventoryChange(some(current.inventories[0]), some(badInventory), defaultSystemBalancePolicy)).toMatchObject({ ok: false, error: { kind: 'IncompatibleUnits' } })
    expect(createSystemBalanceError('MissingPreviousWeeklyFacts', 'previous')).toEqual({ kind: 'MissingPreviousWeeklyFacts', input: 'previous' })
  })
})

describe('System Balance state, caveats, confidence, and drivers', () => {
  it('classifies tightening, loosening, balanced, mixed, and unknown states', () => {
    const tightening = unwrapSuccess(composeSystemBalanceAnalysis(some(currentTightening()), some(previousBase()), defaultSystemBalancePolicy))
    const loosening = unwrapSuccess(composeSystemBalanceAnalysis(some(facts('2026-05-19T00:00:00.000Z', 106, 20, 2, 1, 16)), some(previousBase()), defaultSystemBalancePolicy))
    const balanced = unwrapSuccess(composeSystemBalanceAnalysis(some(facts('2026-05-19T00:00:00.000Z', 100.5, 15, 1, 0, 16)), some(previousBase()), defaultSystemBalancePolicy))
    const mixed = unwrapSuccess(composeSystemBalanceAnalysis(some(facts('2026-05-19T00:00:00.000Z', 106, 10, 2, 1, 16)), some(previousBase()), defaultSystemBalancePolicy))
    const unknown = unwrapSuccess(classifyBalanceState(none(), none(), defaultSystemBalancePolicy))

    expect(tightening.balanceState).toBe('Tightening')
    expect(loosening.balanceState).toBe('Loosening')
    expect(balanced.balanceState).toBe('Balanced')
    expect(mixed.balanceState).toBe('Mixed')
    expect(unknown).toBe('Unknown')
  })

  it('selects structured drivers, caveats, and physical confidence without price confirmation', () => {
    const analysis = unwrapSuccess(composeSystemBalanceAnalysis(some(currentTightening()), some(previousBase()), defaultSystemBalancePolicy))
    const caveats = createBalanceCaveats('Mixed', currentTightening(), defaultSystemBalancePolicy)
    const confidence = assignBalanceConfidence('Mixed', caveats, defaultSystemBalancePolicy)
    const drivers = identifyBalanceDrivers(currentTightening(), previousBase(), analysis.inventoryChange, analysis.supplyPressure, defaultSystemBalancePolicy)

    expect(analysis.drivers.map(driver => driver.kind)).toContain('InventoryDraw')
    expect(drivers.map(driver => driver.kind)).toContain('SupplyPressureMovement')
    expect(caveats.map(value => value.kind)).toContain('MixedSignalDirection')
    expect(confidence.level).toBe('Medium')
  })
})

describe('System Balance composition and exports', () => {
  it('composes SystemBalanceAnalysis from current and previous Measurement facts', () => {
    const analysis: SystemBalanceAnalysis = unwrapSuccess(composeSystemBalanceAnalysis(some(currentTightening()), some(previousBase()), defaultSystemBalancePolicy))

    expect(analysis.netImports.value).toBe(3)
    expect(analysis.availableSupply.value).toBe(13)
    expect(analysis.confidence.level).toBe('High')
  })

  it('returns representative composition failures', () => {
    const missingPrevious = composeSystemBalanceAnalysis(some(currentTightening()), none(), defaultSystemBalancePolicy)
    const missingSupply = unwrapSuccess(assembleWeeklyPetroleumFactsWithPolicy({
      policy: { ...fullFirstReleaseRequiredMeasurementPolicy, requireSupply: false, requireRefinery: false },
      inventories: [inventory('2026-05-19T00:00:00.000Z', 95)],
      refinery: none(),
      supply: none(),
      prices: [price('2026-05-19T00:00:00.000Z')],
    }))

    expect(missingPrevious).toMatchObject({ ok: false, error: { kind: 'MissingPreviousWeeklyFacts' } })
    expect(composeSystemBalanceAnalysis(some(missingSupply), some(previousBase()), defaultSystemBalancePolicy)).toMatchObject({ ok: false, error: { kind: 'MissingSupply' } })
  })
})
