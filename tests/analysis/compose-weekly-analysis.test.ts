import { describe, expect, it } from 'vitest'

import {
  buildCoreWeeklyCaveats,
  buildCoreWeeklyExplanation,
  buildCoreWeeklySummary,
  assignCoreWeeklyConfidence,
  classifyCoreWeeklySignalAlignment,
  composeWeeklyAnalysis,
  createCoreWeeklyAnalysisPolicies,
  selectCoreWeeklySignals,
} from '@/contexts/analysis'
import { createAnalysisSignalAlignment, createWeeklyAnalysis } from '@/contexts/analysis/model'
import {
  buildPreviousObservationMap,
  contextualizeCoreWeeklySignalSet,
  createHistoricalObservation,
  createInventorySignal,
  createInventorySignalIdentity,
  createPriceSignal,
  createPriceSignalIdentity,
  createCoreWeeklyInterpretationPolicies,
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

const buildCoreWeeklyInputs = () => {
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
    contextualizeCoreWeeklySignalSet(
      { inventory: inventorySignal, price: priceSignal },
      previousObservations,
      createCoreWeeklyInterpretationPolicies(unwrapSuccess(parseComparisonWindow('OneWeek')), 5, 1),
    ),
  )

  return { facts, contextualized }
}

describe('Core weekly Analysis composition', () => {
  it('selects the core-weekly key signals', () => {
    const { contextualized } = buildCoreWeeklyInputs()
    const selected = unwrapSuccess(selectCoreWeeklySignals(contextualized))

    expect(selected.inventory).toBe(contextualized.inventory)
    expect(selected.price).toBe(contextualized.price)
  })

  it('fails when a required core-weekly key signal is missing', () => {
    const { contextualized } = buildCoreWeeklyInputs()
    const missingPrice = selectCoreWeeklySignals({ inventory: contextualized.inventory })
    const isFailureResult = (
      candidate: Result<unknown, AnalysisError>,
    ): candidate is Extract<Result<unknown, AnalysisError>, { readonly ok: false }> => candidate.ok === false

    const missingKind = ifElse(isFailureResult, candidate => candidate.error.kind, () => undefined)(missingPrice)

    expect(missingPrice.ok).toBe(false)
    expect(missingKind).toBe('MissingContextualizedSignal')
  })

  it('builds a cautious analysis from aligned inventory draw and price rise', () => {
    const { facts, contextualized } = buildCoreWeeklyInputs()
    const analysis = unwrapSuccess(composeWeeklyAnalysis(facts, contextualized, createCoreWeeklyAnalysisPolicies()))

    expect(analysis.alignment.alignment).toBe('AlignedTightening')
    expect(analysis.condition.condition).toBe('Unknown')
    expect(analysis.confidence.confidence).toBe('Medium')
    expect(analysis.headline).toContain('suggests a tighter signal')
    expect(analysis.summary).toContain('full system balance is not computed')
    expect(analysis.explanation).toContain('physical storage signal')
    expect(analysis.headline).not.toMatch(/proves|guarantees|will cause|must mean|certainly/i)
    expect(analysis.summary).not.toMatch(/proves|guarantees|will cause|must mean|certainly/i)
    expect(analysis.explanation).not.toMatch(/proves|guarantees|will cause|must mean|certainly/i)
    expect(analysis.caveats.some(caveat => caveat.kind === 'FullSystemBalanceNotComputed')).toBe(true)
    expect(analysis.caveats.some(caveat => caveat.kind === 'RefineryDataNotIncluded')).toBe(true)
    expect(analysis.caveats.some(caveat => caveat.kind === 'SupplyDataNotIncluded')).toBe(true)
  })

  it('writes a cautious summary from aligned signals', () => {
    const { contextualized } = buildCoreWeeklyInputs()
    const policies = createCoreWeeklyAnalysisPolicies()
    const keySignals = unwrapSuccess(selectCoreWeeklySignals(contextualized))
    const alignment = unwrapSuccess(classifyCoreWeeklySignalAlignment(keySignals))
    const caveats = buildCoreWeeklyCaveats(keySignals, policies)
    const summary = unwrapSuccess(buildCoreWeeklySummary(keySignals, alignment, caveats, policies))

    expect(summary).toContain('Crude inventory drew while WTI rose')
    expect(summary).toContain('full system balance is not computed')
    expect(summary).not.toMatch(/proves|guarantees|will cause|must mean|certainly/i)
  })

  it('writes a careful explanation from aligned signals', () => {
    const { contextualized } = buildCoreWeeklyInputs()
    const policies = createCoreWeeklyAnalysisPolicies()
    const keySignals = unwrapSuccess(selectCoreWeeklySignals(contextualized))
    const alignment = unwrapSuccess(classifyCoreWeeklySignalAlignment(keySignals))
    const caveats = buildCoreWeeklyCaveats(keySignals, policies)
    const explanation = unwrapSuccess(buildCoreWeeklyExplanation(keySignals, alignment, caveats, policies))

    expect(explanation).toContain('physical storage signal')
    expect(explanation).toContain('market context')
    expect(explanation).toContain('Full system balance is not part of this weekly run yet')
    expect(explanation).toContain('Refinery data is not part of this weekly run yet')
    expect(explanation).toContain('Supply data is not part of this weekly run yet')
    expect(explanation).not.toMatch(/proves|guarantees|will cause|must mean|certainly/i)
  })

  it('builds the full core-weekly caveat set with propagated trend caveats', () => {
    const { contextualized } = buildCoreWeeklyInputs()
    const policies = createCoreWeeklyAnalysisPolicies()
    const keySignals = unwrapSuccess(selectCoreWeeklySignals(contextualized))
    const caveats = buildCoreWeeklyCaveats(keySignals, policies)

    expect(caveats.some(caveat => caveat.kind === 'FullSystemBalanceNotComputed')).toBe(true)
    expect(caveats.some(caveat => caveat.kind === 'RefineryDataNotIncluded')).toBe(true)
    expect(caveats.some(caveat => caveat.kind === 'SupplyDataNotIncluded')).toBe(true)
    expect(caveats.some(isPropagatedTrendNotComputed)).toBe(false)

    const missingTrendKeySignals: typeof keySignals = {
      ...keySignals,
      inventory: withoutTrend(keySignals.inventory),
    }
    const missingTrendCaveats = buildCoreWeeklyCaveats(missingTrendKeySignals, policies)

    expect(missingTrendCaveats.some(isPropagatedTrendNotComputed)).toBe(true)
    expect(new Set(missingTrendCaveats.map(caveat => caveat.kind)).size).toBeGreaterThanOrEqual(4)
  })

  it('assigns conservative core-weekly confidence for each alignment', () => {
    const policies = createCoreWeeklyAnalysisPolicies()

    expect(unwrapSuccess(assignCoreWeeklyConfidence(createAnalysisSignalAlignment('AlignedTightening'), policies)).confidence).toBe('Medium')
    expect(unwrapSuccess(assignCoreWeeklyConfidence(createAnalysisSignalAlignment('AlignedLoosening'), policies)).confidence).toBe('Medium')
    expect(unwrapSuccess(assignCoreWeeklyConfidence(createAnalysisSignalAlignment('Mixed'), policies)).confidence).toBe('Low')
    expect(unwrapSuccess(assignCoreWeeklyConfidence(createAnalysisSignalAlignment('Insufficient'), policies)).confidence).toBe('Unknown')
  })

  it('composes a WeeklyAnalysis from aligned evidence', () => {
    const { facts, contextualized } = buildCoreWeeklyInputs()
    const analysis = unwrapSuccess(composeWeeklyAnalysis(facts, contextualized, createCoreWeeklyAnalysisPolicies()))

    expect(analysis).toEqual(expect.objectContaining({
      headline: expect.any(String),
      summary: expect.any(String),
      explanation: expect.any(String),
    }))
    expect(analysis.keySignals.inventory).toBe(contextualized.inventory)
    expect(analysis.keySignals.price).toBe(contextualized.price)
    expect(analysis.supportingSignals).toHaveLength(2)
    expect(analysis.contradictorySignals).toHaveLength(0)
    expect(analysis).toEqual(expect.objectContaining(createWeeklyAnalysis(
      analysis.reportWeek,
      analysis.geography,
      analysis.condition,
      analysis.headline,
      analysis.summary,
      analysis.explanation,
      analysis.keySignals,
      analysis.supportingSignals,
      analysis.contradictorySignals,
      analysis.caveats,
      analysis.confidence,
      analysis.alignment,
    )))
  })

  it('writes a looser headline for aligned loosening', () => {
    const { facts, contextualized } = buildCoreWeeklyInputs()
    const loosenedContextualized: typeof contextualized = {
      ...contextualized,
      inventory: withTrendDirection(contextualized.inventory, 'Up'),
      price: withTrendDirection(contextualized.price, 'Down'),
    }

    const analysis = unwrapSuccess(composeWeeklyAnalysis(facts, loosenedContextualized, createCoreWeeklyAnalysisPolicies()))

    expect(analysis.alignment.alignment).toBe('AlignedLoosening')
    expect(analysis.headline).toContain('Crude inventory built and WTI fell')
    expect(analysis.headline).toContain('suggests a looser signal')
  })

  it('writes a cautious headline when trend context is missing', () => {
    const { facts, contextualized } = buildCoreWeeklyInputs()
    const missingTrendContextualized: typeof contextualized = {
      ...contextualized,
      inventory: withoutTrend(contextualized.inventory),
    }

    const analysis = unwrapSuccess(composeWeeklyAnalysis(facts, missingTrendContextualized, createCoreWeeklyAnalysisPolicies()))

    expect(analysis.alignment.alignment).toBe('Insufficient')
    expect(analysis.headline).toContain('trend was not clear')
    expect(analysis.headline).toContain('so the read stays cautious')
  })

  it('keeps mixed signals conservative', () => {
    const { facts, contextualized } = buildCoreWeeklyInputs()
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

    const analysis = unwrapSuccess(composeWeeklyAnalysis(facts, mixedContextualized, createCoreWeeklyAnalysisPolicies()))

    expect(analysis.alignment.alignment).toBe('Mixed')
    expect(analysis.condition.condition).toBe('Mixed')
    expect(analysis.confidence.confidence).toBe('Low')
    expect(analysis.headline).toContain('mixed')
  })

  it('retains missing trend caveats without failing', () => {
    const { facts, contextualized } = buildCoreWeeklyInputs()
    const missingTrendContextualized: typeof contextualized = {
      ...contextualized,
      inventory: { ...contextualized.inventory, trend: { kind: 'None' } },
    }

    const analysis = unwrapSuccess(composeWeeklyAnalysis(facts, missingTrendContextualized, createCoreWeeklyAnalysisPolicies()))

    expect(analysis.alignment.alignment).toBe('Insufficient')
    expect(analysis.confidence.confidence).toBe('Unknown')
    expect(analysis.caveats.some(isPropagatedTrendNotComputed)).toBe(true)
  })

  it('fails when a required contextualized signal is missing', () => {
    const { facts, contextualized } = buildCoreWeeklyInputs()
    const analysis = composeWeeklyAnalysis(facts, { inventory: contextualized.inventory }, createCoreWeeklyAnalysisPolicies())

    expect(analysis.ok).toBe(false)
  })

  it('rejects a narrative policy that forbids the generated headline language', () => {
    const { facts, contextualized } = buildCoreWeeklyInputs()
    const restrictivePolicies = {
      ...createCoreWeeklyAnalysisPolicies(),
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
    const { facts, contextualized } = buildCoreWeeklyInputs()

    const provisionalPolicies = {
      ...createCoreWeeklyAnalysisPolicies(),
      allowProvisionalConditionLabels: true,
    }

    const analysis = unwrapSuccess(composeWeeklyAnalysis(facts, contextualized, provisionalPolicies))

    expect(analysis.alignment.alignment).toBe('AlignedTightening')
    expect(analysis.condition.condition).toBe('Tightening')
  })
})
