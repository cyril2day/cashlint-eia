import { describe, expect, it } from 'vitest'

import {
  assignFullAnalysisConfidence,
  buildFullAnalysisHeadline,
  classifyFullAnalysisContradictorySignals,
  classifyFullAnalysisSupportingSignals,
  composeFullAnalysisCaveats,
  composeFullWeeklyAnalysis,
  createAnalysisCondition,
  createAnalysisSignalAlignment,
  createFullAnalysisPolicies,
  determineFullAnalysisCondition,
  selectFullAnalysisDrivers,
} from '@/contexts/analysis'
import type { AnalysisError } from '@/contexts/analysis/errors'
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
  parseComparisonWindow,
  parseGeographyScope,
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
  createWalkingSkeletonInterpretationPolicies,
} from '@/contexts/interpretation'
import { parseDecimal } from '@/shared/decimal'
import { ifElse } from '@/shared/fp'
import { isFailure, isSuccess, type FailureResult, type Result } from '@/shared/result'
import { none, some } from '@/shared/maybe'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    isSuccess,
    candidate => candidate.value,
    (): SuccessValue => {
      throw new Error('expected success')
    },
  )(result)

const isAnalysisFailure = <SuccessValue>(
  result: Result<SuccessValue, AnalysisError>,
): result is FailureResult<AnalysisError> => result.ok === false

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

const inventoryIdentity = () => createInventorySignalIdentity(geography(), inventoryKind(), inventorySlice(), inventoryProduct())
const priceIdentity = () => createPriceSignalIdentity(geography(), priceMeasurementKind(), priceSlice(), priceKind())

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
  inventory: unwrapSuccess(contextualizeFullSignal(inventorySignal(95), inventoryHistory(inventoryValues), createWalkingSkeletonInterpretationPolicies(unwrapSuccess(parseComparisonWindow('OneWeek')), 5, 1))),
  price: unwrapSuccess(contextualizeFullSignal(priceSignal(72), priceHistory(priceValues), createWalkingSkeletonInterpretationPolicies(unwrapSuccess(parseComparisonWindow('OneWeek')), 5, 1))),
})

describe('Full analysis workflows', () => {
  it('determines mixed condition when balance and alignment conflict', () => {
    const result = determineFullAnalysisCondition(
      analysisBalance(),
      createAnalysisSignalAlignment('AlignedLoosening'),
      createFullAnalysisPolicies(),
    )

    expect(unwrapSuccess(result).condition).toBe('Mixed')
  })

  it('returns unknown condition from unknown balance state', () => {
    const unknownBalance: SystemBalanceAnalysis = {
      ...analysisBalance(),
      balanceState: 'Unknown',
    }

    const result = determineFullAnalysisCondition(
      unknownBalance,
      createAnalysisSignalAlignment('Insufficient'),
      createFullAnalysisPolicies(),
    )

    expect(unwrapSuccess(result).condition).toBe('Unknown')
  })

  it('fails key driver selection when no system drivers exist', () => {
    const withoutDrivers: SystemBalanceAnalysis = {
      ...analysisBalance(),
      drivers: [],
    }

    const result = selectFullAnalysisDrivers(withoutDrivers, createFullAnalysisPolicies())

    expect(isFailure(result)).toBe(true)
    ifElse(
      isAnalysisFailure,
      candidate => expect(candidate.error.kind).toBe('UnableToSelectKeyDrivers'),
      () => {
        throw new Error('expected failure')
      },
    )(result)
  })

  it('classifies supporting and contradictory signals for tightening and mixed conditions', () => {
    const keySignals = contextualizedSignals([100, 102], [70, 69])
    const tightening = createAnalysisCondition('Tightening')
    const mixed = createAnalysisCondition('Mixed')

    const supporting = classifyFullAnalysisSupportingSignals(keySignals, tightening)
    const contradictory = classifyFullAnalysisContradictorySignals(keySignals, mixed)

    expect(supporting.length).toBeGreaterThan(0)
    expect(contradictory.length).toBeGreaterThan(0)
  })

  it('adds mixed evidence caveat and degrades confidence on contradiction', () => {
    const balance = analysisBalance()
    const signals = contextualizedSignals([80, 70], [74, 76])
    const mixed = createAnalysisCondition('Mixed')
    const contradictorySignals = classifyFullAnalysisContradictorySignals(signals, mixed)

    const confidence = assignFullAnalysisConfidence(
      balance,
      mixed,
      [],
      contradictorySignals,
      createFullAnalysisPolicies(),
    )

    const caveats = composeFullAnalysisCaveats(
      balance,
      signals,
      mixed,
      [],
      contradictorySignals,
      confidence,
    )

    expect(confidence.confidence).toBe('Medium')
    expect(caveats.some(caveat => caveat.kind === 'MixedEvidence')).toBe(true)
  })

  it('rejects full analysis headline when policy forbids generated phrase', () => {
    const restrictedPolicies = {
      ...createFullAnalysisPolicies(),
      forbiddenNarrativePhrases: ['weekly read'],
    }

    const result = buildFullAnalysisHeadline(
      createAnalysisCondition('Tightening'),
      analysisBalance().drivers,
      restrictedPolicies,
    )

    expect(isFailure(result)).toBe(true)
    ifElse(
      isAnalysisFailure,
      candidate => expect(candidate.error.kind).toBe('UnableToComposeFullAnalysis'),
      () => {
        throw new Error('expected failure')
      },
    )(result)
  })

  it('fails full composition when policy is invalid', () => {
    const invalidPolicies = {
      ...createFullAnalysisPolicies(),
      preferredNarrativePhrases: [],
    }

    const result = composeFullWeeklyAnalysis(
      analysisBalance(),
      contextualizedSignals([100, 102], [70, 69]),
      invalidPolicies,
    )

    expect(isFailure(result)).toBe(true)
    ifElse(
      isAnalysisFailure,
      candidate => expect(candidate.error.kind).toBe('InvalidAnalysisPolicy'),
      () => {
        throw new Error('expected failure')
      },
    )(result)
  })
})
