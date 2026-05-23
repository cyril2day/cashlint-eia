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
import { createTrendNotComputedCaveat } from '@/contexts/interpretation/model/interpretation-caveat'
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
    'Full system balance is not computed, so the walking skeleton stays cautious.',
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
  it('maps weekly analysis into presentation-safe summary and card view models', () => {
    const analysis = buildAnalysis()
    const viewModel = mapWeeklyAnalysisToSummaryViewModel(analysis)

    expect(viewModel.reportWeekText).toBe('2026-05-19')
    expect(viewModel.geographyText).toBe('USTotal')
    expect(viewModel.headline).toContain('Inventory drew while price rose')
    expect(viewModel.summary).toContain('walking skeleton stays cautious')
    expect(viewModel.conditionLabel).toBe('Unknown')
    expect(viewModel.confidenceLabel).toBe('Medium')
    expect(viewModel.displayState).toBe('partial')
    expect(viewModel.caveats).toHaveLength(4)
    expect(viewModel.cards).toHaveLength(2)

    expect(viewModel.cards[0]).toEqual(expect.objectContaining({
      kind: 'inventory',
      title: 'Inventory',
      valueText: '80 ThousandBarrels',
      statusLabel: 'Unknown',
      subtitleText: { kind: 'Some', value: '2026-05-19 · USTotal' },
      trendLabel: { kind: 'None' },
      anomalyLabel: { kind: 'Some', value: 'Inventory anomaly is not computed yet.' },
      caveatLabel: { kind: 'None' },
      drilldownTarget: { kind: 'None' },
    }))

    expect(viewModel.cards[1]).toEqual(expect.objectContaining({
      kind: 'price',
      title: 'WTI price',
      valueText: '72 USDPerBarrel',
      statusLabel: 'Unknown',
      subtitleText: { kind: 'Some', value: '2026-05-19 · USTotal' },
      trendLabel: { kind: 'Some', value: 'Up' },
      anomalyLabel: { kind: 'Some', value: 'Price anomaly is not computed yet.' },
      caveatLabel: { kind: 'None' },
      drilldownTarget: { kind: 'None' },
    }))

    expect(viewModel.displayStateMessage).toEqual({ kind: 'Some', value: 'Walking-skeleton output includes caveats.' })

    expect(viewModel.caveats.map(caveat => caveat.kind)).toEqual([
      'full-system-balance-not-computed',
      'refinery-data-not-included',
      'supply-data-not-included',
      'trend-not-computed',
    ])
  })
})