import React, { type ReactNode } from 'react'

import type {
  AreaChartViewModel,
  BarChartViewModel,
  BoxPlotViewModel,
  HistogramViewModel,
  MetricCardViewModel,
  SparklineViewModel,
  ChartDimensions,
  TimeSeriesChartViewModel,
  VarianceChartViewModel,
} from '@/presentation/charts/contracts'
import type { ChartGalleryControlsViewModel } from '@/presentation/contracts'
import type { HistogramWidgetInput } from '@/presentation/charts/widgets/histogram/histogram-widget'
import {
  composeTimeSeriesChartGeometry,
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
import { TimeSeriesChart } from '@/presentation/charts/components/time-series-chart/time-series-chart'
import { MetricCardChart } from '@/presentation/charts/components/metric-card-chart/metric-card-chart'
import { BarChart } from '@/presentation/charts/components/bar-chart/bar-chart'
import { BoxPlotChart } from '@/presentation/charts/components/box-plot-chart/box-plot-chart'
import { VarianceChart } from '@/presentation/charts/components/variance-chart/variance-chart'

export const defaultChartPanelControls: ChartGalleryControlsViewModel = {
  histogramBinCount: 6,
  lineXAxisTickCount: 3,
  areaXAxisTickCount: 3,
}

type TimeSeriesPanel = ChartPanelViewModel & Readonly<{
  readonly chartKind: 'TimeSeries'
  readonly chartViewModel: TimeSeriesChartViewModel
}>

type SparklinePanel = ChartPanelViewModel & Readonly<{
  readonly chartKind: 'Sparkline'
  readonly chartViewModel: SparklineViewModel
}>

type MetricCardPanel = ChartPanelViewModel & Readonly<{
  readonly chartKind: 'MetricCard'
  readonly chartViewModel: MetricCardViewModel
}>

type BarChartPanel = ChartPanelViewModel & Readonly<{
  readonly chartKind: 'BarChart'
  readonly chartViewModel: BarChartViewModel
}>

type HistogramPanel = ChartPanelViewModel & Readonly<{
  readonly chartKind: 'Histogram'
  readonly chartViewModel: HistogramViewModel
}>

type BoxPlotPanel = ChartPanelViewModel & Readonly<{
  readonly chartKind: 'BoxPlot'
  readonly chartViewModel: BoxPlotViewModel
}>

type AreaChartPanel = ChartPanelViewModel & Readonly<{
  readonly chartKind: 'AreaChart'
  readonly chartViewModel: AreaChartViewModel
}>

type VarianceChartPanel = ChartPanelViewModel & Readonly<{
  readonly chartKind: 'VarianceChart'
  readonly chartViewModel: VarianceChartViewModel
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

const timeSeriesPanelDimensions = (): ChartDimensions => {
  const dimensions = createChartDimensions(520, 240, {
    top: 18,
    right: 18,
    bottom: 62,
    left: 64,
  })

  return ifElse(
    isDimensionsSuccess,
    candidate => candidate.value,
    () => ({
      outerWidth: 520,
      outerHeight: 240,
      margin: {
        top: 18,
        right: 18,
        bottom: 62,
        left: 64,
      },
      innerWidth: 438,
      innerHeight: 160,
    }),
  )(dimensions)
}

const isTimeSeriesPanel = (panel: ChartPanelViewModel): panel is TimeSeriesPanel => panel.chartKind === 'TimeSeries'
const isSparklinePanel = (panel: ChartPanelViewModel): panel is SparklinePanel => panel.chartKind === 'Sparkline'
const isMetricCardPanel = (panel: ChartPanelViewModel): panel is MetricCardPanel => panel.chartKind === 'MetricCard'
const isBarChartPanel = (panel: ChartPanelViewModel): panel is BarChartPanel => panel.chartKind === 'BarChart'
const isHistogramPanel = (panel: ChartPanelViewModel): panel is HistogramPanel => panel.chartKind === 'Histogram'
const isBoxPlotPanel = (panel: ChartPanelViewModel): panel is BoxPlotPanel => panel.chartKind === 'BoxPlot'
const isAreaChartPanel = (panel: ChartPanelViewModel): panel is AreaChartPanel => panel.chartKind === 'AreaChart'
const isVarianceChartPanel = (panel: ChartPanelViewModel): panel is VarianceChartPanel => panel.chartKind === 'VarianceChart'

const histogramInputWithControls = (
  input: HistogramWidgetInput,
  controls: ChartGalleryControlsViewModel,
): HistogramWidgetInput => ({
  ...input,
  binStrategy: {
    kind: 'Automatic',
    requestedBinCount: controls.histogramBinCount,
  },
})

const renderTimeSeriesPanel =
  (controls: ChartGalleryControlsViewModel) =>
  (panel: TimeSeriesPanel): ReactNode => (
  <TimeSeriesChart
    viewModel={panel.chartViewModel}
    geometry={composeTimeSeriesChartGeometry(panel.chartViewModel, timeSeriesPanelDimensions(), {
      xTickCount: controls.lineXAxisTickCount,
      yTickCount: 5,
    })}
  />
)

const renderSparklinePanel = (panel: SparklinePanel): ReactNode => {
  const input = mapSparklineViewModelToWidgetInput(panel.chartViewModel)

  return (
    <Sparkline
      input={input}
      geometry={composeSparklineGeometry(input, sparklinePanelDimensions())}
    />
  )
}

const renderHistogramPanel =
  (controls: ChartGalleryControlsViewModel) =>
  (panel: HistogramPanel): ReactNode => (
  <HistogramChart input={histogramInputWithControls(mapHistogramViewModelToWidgetInput(panel.chartViewModel), controls)} />
)
const renderAreaChartPanel =
  (controls: ChartGalleryControlsViewModel) =>
  (panel: AreaChartPanel): ReactNode => (
  <AreaChart input={mapAreaChartViewModelToWidgetInput(panel.chartViewModel)} xAxisTickCount={controls.areaXAxisTickCount} />
)
const renderMetricCardPanel = (panel: MetricCardPanel): ReactNode => <MetricCardChart viewModel={panel.chartViewModel} />
const renderBarChartPanel = (panel: BarChartPanel): ReactNode => <BarChart viewModel={panel.chartViewModel} />
const renderBoxPlotPanel = (panel: BoxPlotPanel): ReactNode => <BoxPlotChart viewModel={panel.chartViewModel} />
const renderVarianceChartPanel = (panel: VarianceChartPanel): ReactNode => <VarianceChart viewModel={panel.chartViewModel} />

const renderUnknownPanel = (panel: ChartPanelViewModel): ReactNode => (
  <span className="chart-panel__visual-label">{panel.chartKind}</span>
)

const renderAfterAreaChart = (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isVarianceChartPanel, renderVarianceChartPanel, renderUnknownPanel)(panel)

const renderAfterBoxPlot =
  (controls: ChartGalleryControlsViewModel) =>
  (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isAreaChartPanel, renderAreaChartPanel(controls), renderAfterAreaChart)(panel)

const renderAfterHistogram =
  (controls: ChartGalleryControlsViewModel) =>
  (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isBoxPlotPanel, renderBoxPlotPanel, renderAfterBoxPlot(controls))(panel)

const renderAfterBarChart =
  (controls: ChartGalleryControlsViewModel) =>
  (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isHistogramPanel, renderHistogramPanel(controls), renderAfterHistogram(controls))(panel)

const renderAfterMetricCard =
  (controls: ChartGalleryControlsViewModel) =>
  (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isBarChartPanel, renderBarChartPanel, renderAfterBarChart(controls))(panel)

const renderAfterSparkline =
  (controls: ChartGalleryControlsViewModel) =>
  (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isMetricCardPanel, renderMetricCardPanel, renderAfterMetricCard(controls))(panel)

const renderAfterTimeSeries =
  (controls: ChartGalleryControlsViewModel) =>
  (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isSparklinePanel, renderSparklinePanel, renderAfterSparkline(controls))(panel)

const renderChartPayload =
  (controls: ChartGalleryControlsViewModel) =>
  (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isTimeSeriesPanel, renderTimeSeriesPanel(controls), renderAfterTimeSeries(controls))(panel)

const chartKindLabel = (chartKind: ChartPanelKind): string =>
  cond<[ChartPanelKind], string>([
    [candidate => candidate === 'TimeSeries', () => 'Line chart'],
    [candidate => candidate === 'Sparkline', () => 'Sparkline'],
    [candidate => candidate === 'MetricCard', () => 'KPI card'],
    [candidate => candidate === 'BarChart', () => 'Bar chart'],
    [candidate => candidate === 'Histogram', () => 'Histogram'],
    [candidate => candidate === 'BoxPlot', () => 'Box plot'],
    [candidate => candidate === 'AreaChart', () => 'Area chart'],
    [candidate => candidate === 'VarianceChart', () => 'Variance chart'],
    [() => true, candidate => candidate],
  ])(chartKind)

export function ChartPanel({ viewModel, controls }: Readonly<{
  readonly viewModel: ChartPanelViewModel
  readonly controls: ChartGalleryControlsViewModel
}>) {
  return (
    <section className={`chart-panel chart-panel--${viewModel.chartKind}`} aria-label={viewModel.accessibilitySummary}>
      <div className="chart-panel__visual" role="img" aria-label={viewModel.chartViewModel.accessibilitySummary}>
        {renderChartPayload(controls)(viewModel)}
      </div>
    </section>
  )
}
