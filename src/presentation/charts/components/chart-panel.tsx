import React, { type ReactNode } from 'react'

import type {
  AreaChartViewModel,
  HistogramViewModel,
  SparklineViewModel,
  ChartDimensions,
} from '@/presentation/charts/contracts'
import {
  composeSparklineGeometry,
  createChartDimensions,
  mapAreaChartViewModelToWidgetInput,
  mapHistogramViewModelToWidgetInput,
  mapSparklineViewModelToWidgetInput,
} from '@/presentation/charts'
import type { ChartPanelKind, ChartPanelViewModel } from '@/presentation/contracts'
import { cond, ifElse } from '@/shared/fp'
import type { Result, SuccessResult } from '@/shared/result'
import { Sparkline } from '@/presentation/charts/components/sparkline/sparkline'
import { HistogramChart } from '@/presentation/charts/components/histogram-chart/histogram-chart'
import { AreaChart } from '@/presentation/charts/components/area-chart/area-chart'

type SparklinePanel = ChartPanelViewModel & Readonly<{
  readonly chartKind: 'Sparkline'
  readonly chartViewModel: SparklineViewModel
}>

type HistogramPanel = ChartPanelViewModel & Readonly<{
  readonly chartKind: 'Histogram'
  readonly chartViewModel: HistogramViewModel
}>

type AreaChartPanel = ChartPanelViewModel & Readonly<{
  readonly chartKind: 'AreaChart'
  readonly chartViewModel: AreaChartViewModel
}>

const sparklineChartMargin = {
  top: 6,
  right: 6,
  bottom: 6,
  left: 6,
}

const sparklineFallbackDimensions: ChartDimensions = {
  outerWidth: 520,
  outerHeight: 120,
  margin: {
    top: 6,
    right: 6,
    bottom: 6,
    left: 6,
  },
  innerWidth: 508,
  innerHeight: 108,
}

const isDimensionsSuccess = (
  result: Result<ChartDimensions, Readonly<{ readonly kind: 'InvalidChartDimensions'; readonly reason: string }>>,
): result is SuccessResult<ChartDimensions> => result.ok === true

const sparklinePanelDimensions = (): ChartDimensions => {
  const dimensions = createChartDimensions(520, 120, sparklineChartMargin)

  return ifElse(
    isDimensionsSuccess,
    candidate => candidate.value,
    () => sparklineFallbackDimensions,
  )(dimensions)
}

const isSparklinePanel = (panel: ChartPanelViewModel): panel is SparklinePanel => panel.chartKind === 'Sparkline'
const isHistogramPanel = (panel: ChartPanelViewModel): panel is HistogramPanel => panel.chartKind === 'Histogram'
const isAreaChartPanel = (panel: ChartPanelViewModel): panel is AreaChartPanel => panel.chartKind === 'AreaChart'

const renderSparklinePanel = (panel: SparklinePanel): ReactNode => {
  const input = mapSparklineViewModelToWidgetInput(panel.chartViewModel)

  return (
    <Sparkline
      input={input}
      geometry={composeSparklineGeometry(input, sparklinePanelDimensions())}
    />
  )
}

const renderHistogramPanel = (panel: HistogramPanel): ReactNode => (
  <HistogramChart input={mapHistogramViewModelToWidgetInput(panel.chartViewModel)} />
)
const renderAreaChartPanel = (panel: AreaChartPanel): ReactNode => (
  <AreaChart input={mapAreaChartViewModelToWidgetInput(panel.chartViewModel)} />
)

const renderUnknownPanel = (panel: ChartPanelViewModel): ReactNode => (
  <span className="chart-panel__visual-label">{panel.chartKind}</span>
)

const renderAfterHistogram = (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isAreaChartPanel, renderAreaChartPanel, renderUnknownPanel)(panel)

const renderAfterSparkline = (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isHistogramPanel, renderHistogramPanel, renderAfterHistogram)(panel)

const renderChartPayload = (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isSparklinePanel, renderSparklinePanel, renderAfterSparkline)(panel)

const chartKindLabel = (chartKind: ChartPanelKind): string =>
  cond<[ChartPanelKind], string>([
    [candidate => candidate === 'Sparkline', () => 'Sparkline'],
    [candidate => candidate === 'Histogram', () => 'Histogram'],
    [candidate => candidate === 'AreaChart', () => 'Area chart'],
    [() => true, candidate => candidate],
  ])(chartKind)

export function ChartPanel({ viewModel }: Readonly<{ readonly viewModel: ChartPanelViewModel }>) {
  return (
    <section className={`chart-panel chart-panel--${viewModel.chartKind}`} aria-label={viewModel.accessibilitySummary}>
      <header className="chart-panel__header">
        <div className="chart-panel__heading">
          <p className="chart-panel__kind">{chartKindLabel(viewModel.chartKind)}</p>
          <h3 className="chart-panel__title">{viewModel.title}</h3>
        </div>
      </header>
      <div className="chart-panel__visual" role="img" aria-label={viewModel.chartViewModel.accessibilitySummary}>
        {renderChartPayload(viewModel)}
      </div>
    </section>
  )
}
