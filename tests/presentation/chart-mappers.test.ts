import { describe, expect, it } from 'vitest'

import {
  mapContextualizedSignalToAreaChart,
  mapContextualizedSignalToHistogram,
  mapSystemBalanceAnalysisToDriverBarChart,
} from '@/presentation'
import type { SystemBalanceAnalysis } from '@/contexts/system-balance'
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
  it('maps historical signal data to histogram and area chart view models', () => {
    const histogram = mapContextualizedSignalToHistogram({
      id: 'wti-histogram',
      title: 'WTI distribution',
      subtitle: none(),
      signal: computedBaselineSignal,
      historicalPoints,
      binStrategy: { kind: 'Automatic', requestedBinCount: 6 },
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
    expect(area.points).toHaveLength(3)
    expect(area.currentMarker.kind).toBe('Some')
  })

  it('preserves NotComputed caveats in active historical chart mappers', () => {
    const histogram = mapContextualizedSignalToHistogram({
      id: 'wti-histogram-missing',
      title: 'WTI distribution',
      subtitle: none(),
      signal: notComputedSignal,
      historicalPoints: [],
      binStrategy: { kind: 'Automatic', requestedBinCount: 6 },
    })

    const area = mapContextualizedSignalToAreaChart({
      id: 'wti-area-missing',
      title: 'WTI magnitude',
      subtitle: none(),
      signal: notComputedSignal,
      historicalPoints: [],
      baseline: some({ value: 0, label: 'Zero baseline' }),
    })

    expect(histogram.values).toHaveLength(0)
    expect(histogram.displayState).toBe('Empty')
    expect(histogram.caveats).toHaveLength(1)
    expect(area.points).toHaveLength(0)
    expect(area.displayState).toBe('Empty')
    expect(area.caveats).toHaveLength(1)
  })

  it('maps physical balance driver chart labels without leaking domain enum tokens', () => {
    const analysis = {
      balanceState: 'Tightening',
      drivers: [
        {
          kind: 'InventoryDraw',
          value: 5,
          unit,
          reportWeek,
          geography,
        },
        {
          kind: 'IncreasedImports',
          value: 2,
          unit,
          reportWeek,
          geography,
        },
      ],
      caveats: [
        {
          kind: 'SimplifiedCrudeBalance',
        },
      ],
    } satisfies Pick<SystemBalanceAnalysis, 'balanceState' | 'drivers' | 'caveats'>

    const chart = mapSystemBalanceAnalysisToDriverBarChart({
      id: 'balance-drivers',
      title: 'Physical balance contributors',
      analysis,
    })

    expect(chart.points.map(point => point.category)).toEqual(['Inventory draw', 'Higher crude imports'])
    expect(chart.caveats.map(caveat => caveat.message)[0]).toContain('simplified weekly crude balance')
    expect(JSON.stringify(chart)).not.toContain('InventoryDraw')
    expect(JSON.stringify(chart)).not.toContain('IncreasedImports')
    expect(JSON.stringify(chart)).not.toContain('SimplifiedCrudeBalance')
  })
})
