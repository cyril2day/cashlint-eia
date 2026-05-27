import { describe, expect, it } from 'vitest'

import { mapWeeklyAnalysisToSummaryViewModel } from '@/presentation'
import { createAnalysisCondition, createAnalysisConfidence, createAnalysisSignalAlignment, createWeeklyAnalysis } from '@/contexts/analysis/model'
import {
  createFullSystemBalanceNotComputedCaveat,
  createPropagatedInterpretationCaveat,
  createRefineryDataNotIncludedCaveat,
  createSupplyDataNotIncludedCaveat,
} from '@/contexts/analysis/model/analysis-caveat'
import { createContextualizedSignalWithTrend, createContextualizedSignalWithoutTrend, createInventorySignal, createInventorySignalIdentity, createPriceSignal, createPriceSignalIdentity } from '@/contexts/interpretation/model'
import { createAnomalyNotComputedCaveat, createTrendNotComputedCaveat } from '@/contexts/interpretation/model/interpretation-caveat'
import { createTrend } from '@/contexts/interpretation/model/trend'
import { parseComparisonWindow, parseGeographyScope, parseInventoryProduct, parseMeasurementKind, parseMeasurementUnit, parsePetroleumSlice, parsePriceKind, parseReportWeek, parseTrendDirection } from '@/contexts/measurement/model'
import { createNotComputedAnomalyState as createNotComputedSignalAnomalyState } from '@/contexts/interpretation/model/anomaly-state'
import { parseDecimal } from '@/shared/decimal'
import { ifElse } from '@/shared/fp'
import { isSuccess, type Result } from '@/shared/result'

const unwrapResult = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    isSuccess,
    candidate => candidate.value,
    () => {
      throw new Error('expected success')
    },
  )(result)

const buildAnalysis = () => {
  const reportWeek = unwrapResult(parseReportWeek('2026-05-19T00:00:00.000Z'))
  const geography = unwrapResult(parseGeographyScope('USTotal'))
  const inventoryProduct = unwrapResult(parseInventoryProduct('CrudeOil'))
  const inventoryKind = unwrapResult(parseMeasurementKind('CrudeStocks'))
  const inventorySlice = unwrapResult(parsePetroleumSlice('Inventory'))
  const priceKind = unwrapResult(parsePriceKind('WTISpot'))
  const priceMeasurementKind = unwrapResult(parseMeasurementKind('WTISpotPrice'))
  const priceSlice = unwrapResult(parsePetroleumSlice('Price'))
  const inventoryUnit = unwrapResult(parseMeasurementUnit('ThousandBarrels'))
  const priceUnit = unwrapResult(parseMeasurementUnit('USDPerBarrel'))
  const comparisonWindow = unwrapResult(parseComparisonWindow('OneWeek'))

  const inventoryIdentity = createInventorySignalIdentity(geography, inventoryKind, inventorySlice, inventoryProduct)
  const priceIdentity = createPriceSignalIdentity(geography, priceMeasurementKind, priceSlice, priceKind)

  const inventorySignal = createInventorySignal(inventoryIdentity, reportWeek, geography, 80, inventoryUnit, inventorySlice)
  const priceSignal = createPriceSignal(priceIdentity, reportWeek, geography, 72, priceUnit, priceSlice)

  const priceTrend = createTrend(comparisonWindow, unwrapResult(parseTrendDirection('Up')), unwrapResult(parseDecimal('4')))

  const keySignals = {
    inventory: createContextualizedSignalWithoutTrend(
      inventorySignal,
      createNotComputedSignalAnomalyState('Inventory anomaly is not computed yet.'),
      [],
    ),
    price: createContextualizedSignalWithTrend(
      priceSignal,
      priceTrend,
      createNotComputedSignalAnomalyState('Price anomaly is not computed yet.'),
      [],
    ),
  }

  return createWeeklyAnalysis(
    reportWeek,
    geography,
    createAnalysisCondition('Unknown'),
    'Inventory drew while price rose, which suggests a tighter signal.',
    'Full system balance is not computed, so this read stays cautious.',
    'Inventory is the physical storage signal, and price is market context.',
    keySignals,
    [],
    [],
    [
      createFullSystemBalanceNotComputedCaveat('Full system balance is not computed.'),
      createRefineryDataNotIncludedCaveat('Refinery data is not included.'),
      createSupplyDataNotIncludedCaveat('Supply data is not included.'),
      createPropagatedInterpretationCaveat(createTrendNotComputedCaveat(inventoryIdentity)),
    ],
    createAnalysisConfidence('Medium'),
    createAnalysisSignalAlignment('AlignedTightening'),
  )
}

describe('mapWeeklyAnalysisToSummaryViewModel', () => {
  it('maps weekly analysis into summary and card view models ready for presentation', () => {
    const analysis = buildAnalysis()
    const viewModel = mapWeeklyAnalysisToSummaryViewModel(analysis)

    expect(viewModel.reportWeekText).toBe('May 19, 2026')
    expect(viewModel.geographyText).toBe('United States')
    expect(viewModel.headline).toContain('Inventory drew while price rose')
    expect(viewModel.summary).toContain('this read stays cautious')
    expect(viewModel.conditionLabel).toBe('Unknown')
    expect(viewModel.confidenceLabel).toBe('Medium')
    expect(viewModel.displayState).toBe('partial')
    expect(viewModel.caveats).toHaveLength(4)
    expect(viewModel.cards).toHaveLength(2)

    expect(viewModel.cards[0]).toEqual(expect.objectContaining({
      kind: 'inventory',
      title: 'Crude Stocks',
      valueText: '0.1 million barrels',
      statusLabel: 'Unknown',
      subtitleText: { kind: 'Some', value: 'U.S. commercial crude inventories' },
      trendLabel: { kind: 'None' },
      anomalyLabel: { kind: 'Some', value: 'Inventory anomaly is not computed yet.' },
      caveatLabel: { kind: 'None' },
      drilldownTarget: { kind: 'Some', value: '/inventory' },
    }))

    expect(viewModel.cards[1]).toEqual(expect.objectContaining({
      kind: 'price',
      title: 'WTI Spot Price',
      valueText: '$72.00',
      statusLabel: 'Unknown',
      subtitleText: { kind: 'Some', value: 'West Texas Intermediate spot price' },
      trendLabel: { kind: 'Some', value: 'Up $4.00 vs. last week' },
      anomalyLabel: { kind: 'Some', value: 'Price anomaly is not computed yet.' },
      caveatLabel: { kind: 'None' },
      drilldownTarget: { kind: 'Some', value: '/price' },
    }))

    expect(JSON.stringify(viewModel)).not.toContain('InventoryDraw')
    expect(JSON.stringify(viewModel)).not.toContain('WeakerRefineryDemand')
    expect(JSON.stringify(viewModel)).not.toContain('IncreasedImports')
    expect(JSON.stringify(viewModel)).not.toContain('SimplifiedCrudeBalance')
    expect(JSON.stringify(viewModel)).not.toContain('RateToStockComparisonLimitation')

    expect(viewModel.displayStateMessage).toEqual({ kind: 'Some', value: 'Live output includes caveats.' })

    expect(viewModel.caveats.map(caveat => caveat.kind)).toEqual([
      'full-system-balance-not-computed',
      'refinery-data-not-included',
      'supply-data-not-included',
      'trend-not-computed',
    ])
  })

  it('preserves propagated interpretation caveat meaning for anomaly reasons', () => {
    const analysis = buildAnalysis()
    const anomalyReason = 'Anomaly model is not configured for this signal.'

    const viewModel = mapWeeklyAnalysisToSummaryViewModel(
      createWeeklyAnalysis(
        analysis.reportWeek,
        analysis.geography,
        analysis.condition,
        analysis.headline,
        analysis.summary,
        analysis.explanation,
        analysis.keySignals,
        analysis.supportingSignals,
        analysis.contradictorySignals,
        [
          createPropagatedInterpretationCaveat(
            createAnomalyNotComputedCaveat(analysis.keySignals.inventory.signal.identity, anomalyReason),
          ),
        ],
        analysis.confidence,
        analysis.alignment,
      ),
    )

    expect(viewModel.caveats).toEqual([
      expect.objectContaining({
        kind: 'anomaly-not-computed',
        message: anomalyReason,
      }),
    ])
  })
})
