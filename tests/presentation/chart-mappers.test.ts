import { describe, expect, it } from 'vitest'

import {
  mapBarChartInput,
  mapContextualizedSignalToAreaChart,
  mapContextualizedSignalToBoxPlot,
  mapContextualizedSignalToHistogram,
  mapContextualizedSignalToStandaloneMetricCard,
  mapContextualizedSignalToVarianceChart,
  mapSystemBalanceAnalysisToDriverBarChart,
  type BarChartPointInput,
} from '@/presentation'
import type { BalanceDriver } from '@/contexts/system-balance'
import {
  createBaseline,
  createBaselineNotComputedCaveat,
  createComputedBaselineResult,
  createContextualizedSignal,
  createNormalAnomalyState,
  createNotComputedAnomalyState,
  createNotComputedBaselineResult,
  createPriceSignal,
  createPriceSignalIdentity,
} from '@/contexts/interpretation'
import {
  parseGeographyScope,
  parseMeasurementKind,
  parseMeasurementUnit,
  parsePetroleumSlice,
  parsePriceKind,
  parseReportWeek,
} from '@/contexts/measurement/model'
import { ifElse } from '@/shared/fp'
import { none, some } from '@/shared/maybe'
import { isSuccess, type Result } from '@/shared/result'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    isSuccess,
    candidate => candidate.value,
    () => {
      throw new Error('expected success')
    },
  )(result)

const geography = unwrapSuccess(parseGeographyScope('USTotal'))
const measurementKind = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
const slice = unwrapSuccess(parsePetroleumSlice('Price'))
const priceKind = unwrapSuccess(parsePriceKind('WTISpot'))
const unit = unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))
const identity = createPriceSignalIdentity(geography, measurementKind, slice, priceKind)
const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))

const signal = createPriceSignal(
  identity,
  reportWeek,
  geography,
  72,
  unit,
  slice,
)

const computedBaselineSignal = createContextualizedSignal(
  signal,
  none(),
  createComputedBaselineResult(createBaseline(identity, 3, 70, 2, unit)),
  createNormalAnomalyState(0.5),
  [],
)

const notComputedSignal = createContextualizedSignal(
  signal,
  none(),
  createNotComputedBaselineResult('history unavailable'),
  createNotComputedAnomalyState('baseline unavailable'),
  [createBaselineNotComputedCaveat(identity, 'history unavailable')],
)

const historicalPoints = [
  {
    reportWeek: unwrapSuccess(parseReportWeek('2026-05-05T00:00:00.000Z')),
    value: 68,
  },
  {
    reportWeek: unwrapSuccess(parseReportWeek('2026-05-12T00:00:00.000Z')),
    value: 70,
  },
  {
    reportWeek: unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z')),
    value: 72,
  },
]

describe('Presentation chart mappers', () => {
  it('maps contextualized signals to metric cards and preserves display-only status labels', () => {
    const metricCard = mapContextualizedSignalToStandaloneMetricCard({
      id: 'wti-card',
      title: 'WTI spot price',
      signal: computedBaselineSignal,
    })

    expect(metricCard.valueLabel).toBe('72')
    expect(metricCard.statusLabel.kind).toBe('Some')
    expect(metricCard.displayState).toBe('Complete')
  })

  it('maps supplied categorical input to bar chart view models without deciding domain meaning', () => {
    const points: readonly BarChartPointInput[] = [
      {
        category: 'Inventory change',
        value: -3.2,
        valueLabel: '-3.2 million barrels',
        caveats: [],
      },
      {
        category: 'Supply pressure',
        value: 0,
        valueLabel: '0',
        caveats: [],
      },
    ]

    const chart = mapBarChartInput({
      id: 'drivers',
      title: 'Selected drivers',
      subtitle: none(),
      unitLabel: none(),
      ordering: 'InputOrder',
      points,
      caveats: [],
      accessibilitySummary: 'Selected drivers.',
    })

    expect(chart.points.map(point => point.direction)).toEqual(['Negative', 'Zero'])
    expect(chart.displayState).toBe('Complete')
  })

  it('maps System Balance drivers to bar chart view models and preserves caveats', () => {
    const drivers: readonly BalanceDriver[] = [
      {
        kind: 'InventoryDraw',
        value: -5,
        unit,
        reportWeek,
        geography,
      },
      {
        kind: 'SupplyPressureMovement',
        value: 2,
        unit,
        reportWeek,
        geography,
      },
    ]

    const chart = mapSystemBalanceAnalysisToDriverBarChart({
      id: 'balance-drivers',
      title: 'Balance drivers',
      analysis: {
        balanceState: 'Mixed',
        drivers,
        caveats: [{ kind: 'MixedSignalDirection' }],
      },
    })

    expect(chart.points.map(point => point.category)).toEqual(['Inventory draw', 'Supply pressure movement'])
    expect(chart.points.map(point => point.direction)).toEqual(['Negative', 'Positive'])
    expect(chart.caveats).toHaveLength(1)
    expect(chart.displayState).toBe('Partial')
  })

  it('maps historical signal data to histogram, box plot, and area chart view models', () => {
    const histogram = mapContextualizedSignalToHistogram({
      id: 'wti-histogram',
      title: 'WTI distribution',
      subtitle: none(),
      signal: computedBaselineSignal,
      historicalPoints,
      binStrategy: { kind: 'Automatic', requestedBinCount: 6 },
    })

    const boxPlot = mapContextualizedSignalToBoxPlot({
      id: 'wti-box-plot',
      title: 'WTI spread',
      subtitle: none(),
      signal: computedBaselineSignal,
      historicalPoints,
      summary: some({
        minimum: 68,
        firstQuartile: 69,
        median: 70,
        thirdQuartile: 71,
        maximum: 72,
      }),
      outliers: [],
    })

    const area = mapContextualizedSignalToAreaChart({
      id: 'wti-area',
      title: 'WTI magnitude',
      subtitle: none(),
      signal: computedBaselineSignal,
      historicalPoints,
      baseline: some({ value: 0, label: 'Zero baseline' }),
    })

    expect(histogram.values).toHaveLength(3)
    expect(histogram.referenceMarkers).toHaveLength(1)
    expect(boxPlot.summary.kind).toBe('Some')
    expect(boxPlot.referenceMarkers).toHaveLength(1)
    expect(area.points).toHaveLength(3)
    expect(area.currentMarker.kind).toBe('Some')
  })

  it('maps baseline comparison variance and preserves NotComputed as unavailable entries', () => {
    const variance = mapContextualizedSignalToVarianceChart({
      id: 'wti-variance',
      title: 'WTI spot price',
      subtitle: none(),
      signal: computedBaselineSignal,
      referenceLabel: 'Baseline',
      referenceSemantics: 'Interpretation baseline average',
    })

    const notComputedVariance = mapContextualizedSignalToVarianceChart({
      id: 'wti-variance-missing',
      title: 'WTI spot price',
      subtitle: none(),
      signal: notComputedSignal,
      referenceLabel: 'Baseline',
      referenceSemantics: 'Interpretation baseline average',
    })

    expect(variance.entries).toHaveLength(1)
    expect(variance.entries[0].varianceAmount).toBe(2)
    expect(notComputedVariance.entries).toHaveLength(0)
    expect(notComputedVariance.displayState).toBe('NotComputed')
    expect(notComputedVariance.caveats).toHaveLength(1)
  })
})
