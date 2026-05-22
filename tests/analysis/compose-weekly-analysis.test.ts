import { describe, expect, it } from 'vitest'

import { composeWeeklyAnalysis, createWalkingSkeletonAnalysisPolicies, selectWalkingSkeletonSignals } from '@/contexts/analysis'
import {
  buildPreviousObservationMap,
  contextualizeWalkingSkeletonSignalSet,
  createHistoricalObservation,
  createInventorySignal,
  createInventorySignalIdentity,
  createPriceSignal,
  createPriceSignalIdentity,
  createWalkingSkeletonInterpretationPolicies,
} from '@/contexts/interpretation'
import {
  parseComparisonWindow,
  parseGeographyScope,
  parseInventoryProduct,
  parseMeasurementKind,
  parseMeasurementUnit,
  parsePetroleumSlice,
  parsePriceKind,
  parseTrendDirection,
  parseReportWeek,
} from '@/contexts/measurement/model'
import { createWeeklyFact } from '@/contexts/measurement/model/weekly-fact'
import { createInventoryMeasurement } from '@/contexts/measurement/model/inventory-measurement'
import { createPriceMeasurement } from '@/contexts/measurement/model/price-measurement'
import { assembleWeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import type { Trend } from '@/contexts/interpretation/model/trend'
import { parseDecimal } from '@/shared/decimal'
import { none, isSome, type Maybe } from '@/shared/maybe'
import { ifElse } from '@/shared/fp'
import { isSuccess, type Result } from '@/shared/result'
import type { AnalysisCaveat } from '@/contexts/analysis/model/analysis-caveat'
import type { AnalysisError } from '@/contexts/analysis/errors'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue => {
  return ifElse(isSuccess, candidate => candidate.value, () => {
    throw new Error('expected success')
  })(result)
}

const isPropagatedTrendNotComputed = (caveat: AnalysisCaveat): boolean =>
  ifElse(
    (candidate: AnalysisCaveat): candidate is Extract<AnalysisCaveat, { readonly kind: 'PropagatedInterpretationCaveat' }> =>
      candidate.kind === 'PropagatedInterpretationCaveat',
    candidate => candidate.source.kind === 'TrendNotComputed',
    () => false,
  )(caveat)

const withTrendDirection = <SignalType extends { readonly trend: Maybe<Trend> }>(
  signal: SignalType,
  direction: 'Up' | 'Down' | 'Flat',
): SignalType => {
  const currentTrend = ifElse(
    isSome,
    candidate => candidate.value,
    () => {
      throw new Error('expected trend')
    },
  )(signal.trend)

  return {
    ...signal,
    trend: {
      kind: 'Some',
      value: { ...currentTrend, direction: unwrapSuccess(parseTrendDirection(direction)) },
    },
  }
}

const withoutTrend = <SignalType extends { readonly trend: Maybe<Trend> }>(signal: SignalType): SignalType => ({
  ...signal,
  trend: { kind: 'None' },
})

const buildWalkingSkeletonInputs = () => {
  const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
  const previousWeek = unwrapSuccess(parseReportWeek('2026-05-12T00:00:00.000Z'))
  const geography = unwrapSuccess(parseGeographyScope('USTotal'))
  const inventoryProduct = unwrapSuccess(parseInventoryProduct('CrudeOil'))
  const inventoryKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
  const inventorySlice = unwrapSuccess(parsePetroleumSlice('Inventory'))
  const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
  const priceMeasurementKind = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
  const priceSlice = unwrapSuccess(parsePetroleumSlice('Price'))
  const inventoryUnit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))
  const priceUnit = unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))

  const inventoryIdentity = createInventorySignalIdentity(geography, inventoryKind, inventorySlice, inventoryProduct)
  const priceIdentity = createPriceSignalIdentity(geography, priceMeasurementKind, priceSlice, priceKind)

  const inventoryMeasurement = createInventoryMeasurement(
    inventoryProduct,
    createWeeklyFact(reportWeek, geography, inventorySlice, inventoryKind, unwrapSuccess(parseDecimal('80')), inventoryUnit, none()),
  )
  const priceMeasurement = createPriceMeasurement(
    priceKind,
    createWeeklyFact(reportWeek, geography, priceSlice, priceMeasurementKind, unwrapSuccess(parseDecimal('72')), priceUnit, none()),
  )

  const facts = unwrapSuccess(assembleWeeklyPetroleumFacts([inventoryMeasurement], [priceMeasurement]))

  const inventorySignal = createInventorySignal(inventoryIdentity, reportWeek, geography, 80, inventoryUnit, inventorySlice)
  
  const priceSignal = createPriceSignal(priceIdentity, reportWeek, geography, 72, priceUnit, priceSlice)

  const previousObservations = buildPreviousObservationMap([
    createHistoricalObservation(inventoryIdentity, previousWeek, 100, inventoryUnit),
    createHistoricalObservation(priceIdentity, previousWeek, 68, priceUnit),
  ])

  const contextualized = unwrapSuccess(
    contextualizeWalkingSkeletonSignalSet(
      { inventory: inventorySignal, price: priceSignal },
      previousObservations,
      createWalkingSkeletonInterpretationPolicies(unwrapSuccess(parseComparisonWindow('OneWeek')), 5, 1),
    ),
  )

  return { facts, contextualized }
}

describe('Walking-skeleton Analysis composition', () => {
  it('selects the walking-skeleton key signals', () => {
    const { contextualized } = buildWalkingSkeletonInputs()
    const selected = unwrapSuccess(selectWalkingSkeletonSignals(contextualized))

    expect(selected.inventory).toBe(contextualized.inventory)
    expect(selected.price).toBe(contextualized.price)
  })

  it('fails when a required walking-skeleton key signal is missing', () => {
    const { contextualized } = buildWalkingSkeletonInputs()
    const missingPrice = selectWalkingSkeletonSignals({ inventory: contextualized.inventory })
    const isFailureResult = (
      candidate: Result<unknown, AnalysisError>,
    ): candidate is Extract<Result<unknown, AnalysisError>, { readonly ok: false }> => candidate.ok === false

    const missingKind = ifElse(isFailureResult, candidate => candidate.error.kind, () => undefined)(missingPrice)

    expect(missingPrice.ok).toBe(false)
    expect(missingKind).toBe('MissingContextualizedSignal')
  })

  it('builds a cautious analysis from aligned inventory draw and price rise', () => {
    const { facts, contextualized } = buildWalkingSkeletonInputs()
    const analysis = unwrapSuccess(composeWeeklyAnalysis(facts, contextualized, createWalkingSkeletonAnalysisPolicies()))

    expect(analysis.alignment.alignment).toBe('AlignedTightening')
    expect(analysis.condition.condition).toBe('Unknown')
    expect(analysis.confidence.confidence).toBe('Medium')
    expect(analysis.headline).toContain('suggests a tighter signal')
    expect(analysis.summary).toContain('Full system balance is not computed')
    expect(analysis.explanation).toContain('physical storage signal')
    expect(analysis.headline).not.toMatch(/proves|guarantees|will cause|must mean|certainly/i)
    expect(analysis.summary).not.toMatch(/proves|guarantees|will cause|must mean|certainly/i)
    expect(analysis.explanation).not.toMatch(/proves|guarantees|will cause|must mean|certainly/i)
    expect(analysis.caveats.some(caveat => caveat.kind === 'FullSystemBalanceNotComputed')).toBe(true)
    expect(analysis.caveats.some(caveat => caveat.kind === 'RefineryDataNotIncluded')).toBe(true)
    expect(analysis.caveats.some(caveat => caveat.kind === 'SupplyDataNotIncluded')).toBe(true)
  })

  it('writes a looser headline for aligned loosening', () => {
    const { facts, contextualized } = buildWalkingSkeletonInputs()
    const loosenedContextualized: typeof contextualized = {
      ...contextualized,
      inventory: withTrendDirection(contextualized.inventory, 'Up'),
      price: withTrendDirection(contextualized.price, 'Down'),
    }

    const analysis = unwrapSuccess(composeWeeklyAnalysis(facts, loosenedContextualized, createWalkingSkeletonAnalysisPolicies()))

    expect(analysis.alignment.alignment).toBe('AlignedLoosening')
    expect(analysis.headline).toContain('Crude inventory built and WTI fell')
    expect(analysis.headline).toContain('suggests a looser signal')
  })

  it('writes a cautious headline when trend context is missing', () => {
    const { facts, contextualized } = buildWalkingSkeletonInputs()
    const missingTrendContextualized: typeof contextualized = {
      ...contextualized,
      inventory: withoutTrend(contextualized.inventory),
    }

    const analysis = unwrapSuccess(composeWeeklyAnalysis(facts, missingTrendContextualized, createWalkingSkeletonAnalysisPolicies()))

    expect(analysis.alignment.alignment).toBe('Insufficient')
    expect(analysis.headline).toContain('trend was not clear')
    expect(analysis.headline).toContain('so the read stays cautious')
  })

  it('keeps mixed signals conservative', () => {
    const { facts, contextualized } = buildWalkingSkeletonInputs()
    const priceTrend = ifElse(isSome, candidate => candidate.value, () => {
      throw new Error('expected price trend')
    })(contextualized.price.trend)

    const mixedContextualized: typeof contextualized = {
      ...contextualized,
      price: {
        ...contextualized.price,
        trend: {
          kind: 'Some',
          value: { ...priceTrend, direction: unwrapSuccess(parseTrendDirection('Down')) },
        },
      },
    }

    const analysis = unwrapSuccess(composeWeeklyAnalysis(facts, mixedContextualized, createWalkingSkeletonAnalysisPolicies()))

    expect(analysis.alignment.alignment).toBe('Mixed')
    expect(analysis.condition.condition).toBe('Mixed')
    expect(analysis.confidence.confidence).toBe('Low')
    expect(analysis.headline).toContain('mixed')
  })

  it('retains missing trend caveats without failing', () => {
    const { facts, contextualized } = buildWalkingSkeletonInputs()
    const missingTrendContextualized: typeof contextualized = {
      ...contextualized,
      inventory: { ...contextualized.inventory, trend: { kind: 'None' } },
    }

    const analysis = unwrapSuccess(composeWeeklyAnalysis(facts, missingTrendContextualized, createWalkingSkeletonAnalysisPolicies()))

    expect(analysis.alignment.alignment).toBe('Insufficient')
    expect(analysis.confidence.confidence).toBe('Unknown')
    expect(analysis.caveats.some(isPropagatedTrendNotComputed)).toBe(true)
  })

  it('fails when a required contextualized signal is missing', () => {
    const { facts, contextualized } = buildWalkingSkeletonInputs()
    const analysis = composeWeeklyAnalysis(facts, { inventory: contextualized.inventory }, createWalkingSkeletonAnalysisPolicies())

    expect(analysis.ok).toBe(false)
  })

  it('rejects a narrative policy that forbids the generated headline language', () => {
    const { facts, contextualized } = buildWalkingSkeletonInputs()
    const restrictivePolicies = {
      ...createWalkingSkeletonAnalysisPolicies(),
      forbiddenNarrativePhrases: ['suggests'],
    }

    const analysis = composeWeeklyAnalysis(facts, contextualized, restrictivePolicies)
    const isFailureResult = (
      candidate: Result<unknown, AnalysisError>,
    ): candidate is Extract<Result<unknown, AnalysisError>, { readonly ok: false }> => candidate.ok === false

    const errorKind = ifElse(isFailureResult, candidate => candidate.error.kind, () => undefined)(analysis)

    expect(analysis.ok).toBe(false)
    expect(errorKind).toBe('InsufficientEvidenceForNarrative')
  })

  it('applies provisional condition labels when enabled in policies', () => {
    const { facts, contextualized } = buildWalkingSkeletonInputs()

    const provisionalPolicies = {
      ...createWalkingSkeletonAnalysisPolicies(),
      allowProvisionalConditionLabels: true,
    }

    const analysis = unwrapSuccess(composeWeeklyAnalysis(facts, contextualized, provisionalPolicies))

    expect(analysis.alignment.alignment).toBe('AlignedTightening')
    expect(analysis.condition.condition).toBe('Tightening')
  })
})