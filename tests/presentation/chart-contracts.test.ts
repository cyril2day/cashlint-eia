import { describe, expect, it } from 'vitest'

import {
  type AreaChartViewModel,
  type BarChartViewModel,
  type BoxPlotViewModel,
  type ChartCaveatViewModel,
  type HistogramViewModel,
  type MetricCardViewModel,
  type VarianceChartViewModel,
} from '@/presentation'
import { none } from '@/shared/maybe'

const caveat: ChartCaveatViewModel = {
  kind: 'BaselineNotComputed',
  title: 'Baseline not computed',
  message: 'Insufficient historical observations.',
  severity: 'warning',
}

describe('Presentation chart contracts', () => {
  it('supports metric cards without computing missing comparison values as zero', () => {
    const card: MetricCardViewModel = {
      id: 'inventory-card',
      title: 'Crude inventories',
      valueLabel: 'Unavailable',
      unitLabel: none(),
      comparison: none(),
      trendLabel: none(),
      statusLabel: none(),
      caveats: [caveat],
      sparkline: none(),
      accessibilitySummary: 'Crude inventories unavailable with one caveat.',
      displayState: 'Unavailable',
    }

    expect(card.valueLabel).toBe('Unavailable')
    expect(card.comparison.kind).toBe('None')
    expect(card.displayState).toBe('Unavailable')
  })

  it('supports categorical and variance contracts with explicit direction and reference semantics', () => {
    const barChart: BarChartViewModel = {
      id: 'drivers',
      title: 'Selected drivers',
      subtitle: none(),
      unitLabel: none(),
      ordering: 'InputOrder',
      points: [
        {
          category: 'Inventory change',
          value: -3.2,
          valueLabel: '-3.2 million barrels',
          direction: 'Negative',
          caveats: [],
        },
      ],
      caveats: [],
      accessibilitySummary: 'One selected driver with a negative value.',
      displayState: 'Complete',
    }

    const varianceChart: VarianceChartViewModel = {
      id: 'baseline-comparison',
      title: 'Current vs baseline',
      subtitle: none(),
      unitLabel: none(),
      referenceSemantics: 'Interpretation baseline average',
      entries: [
        {
          category: 'WTI spot price',
          actualValue: 72,
          actualValueLabel: '$72/bbl',
          reference: {
            label: 'Baseline',
            value: 70,
            valueLabel: '$70/bbl',
          },
          varianceAmount: 2,
          varianceAmountLabel: '+$2/bbl',
          variancePercentageLabel: none(),
          directionLabel: 'Above reference',
          caveats: [],
        },
      ],
      caveats: [],
      accessibilitySummary: 'WTI spot price is above its supplied baseline reference.',
      displayState: 'Complete',
    }

    expect(barChart.points[0].direction).toBe('Negative')
    expect(varianceChart.referenceSemantics).toBe('Interpretation baseline average')
    expect(varianceChart.entries[0].variancePercentageLabel.kind).toBe('None')
  })

  it('supports distribution and area contracts with explicit missing and partial states', () => {
    const histogram: HistogramViewModel = {
      id: 'history-distribution',
      title: 'Historical distribution',
      subtitle: none(),
      unitLabel: none(),
      values: [],
      binStrategy: { kind: 'Automatic', requestedBinCount: 8 },
      currentMarker: none(),
      referenceMarkers: [],
      caveats: [caveat],
      accessibilitySummary: 'Historical distribution unavailable because baseline was not computed.',
      displayState: 'Empty',
    }

    const boxPlot: BoxPlotViewModel = {
      id: 'historical-spread',
      title: 'Historical spread',
      subtitle: none(),
      unitLabel: none(),
      summary: none(),
      outliers: [],
      currentMarker: none(),
      referenceMarkers: [],
      caveats: [caveat],
      accessibilitySummary: 'Historical spread partial because fewer than five values are available.',
      displayState: 'Partial',
    }

    const areaChart: AreaChartViewModel = {
      id: 'inventory-area',
      title: 'Inventory magnitude',
      subtitle: none(),
      unitLabel: none(),
      points: [
        {
          x: 1777939200000,
          y: none(),
          reportWeekIso: '2026-05-05T00:00:00.000Z',
          valueLabel: none(),
          caveats: [caveat],
        },
      ],
      baseline: none(),
      currentMarker: none(),
      referenceMarkers: [],
      caveats: [caveat],
      accessibilitySummary: 'Inventory magnitude has a missing observation.',
      displayState: 'Partial',
    }

    expect(histogram.values).toHaveLength(0)
    expect(boxPlot.summary.kind).toBe('None')
    expect(areaChart.points[0].y.kind).toBe('None')
  })
})
