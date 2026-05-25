import React, { type ReactNode } from 'react'

import type {
  AreaChartViewModel,
  BarChartViewModel,
  BoxPlotViewModel,
  ChartDimensions,
  HistogramViewModel,
  MetricCardViewModel,
  SparklineViewModel,
  TimeSeriesChartViewModel,
  VarianceChartViewModel,
} from '@/presentation/charts/contracts'
import { composeSparklineGeometry, composeTimeSeriesChartGeometry, createChartDimensions } from '@/presentation/charts'
import type { ChartPanelViewModel, PresentationCaveatViewModel } from '@/presentation/contracts'
import { renderMaybeText } from '@/presentation/utils/render-maybe-text'
import { ifElse } from '@/shared/fp'
import type { Result, SuccessResult } from '@/shared/result'
import { ChartStateMessage } from './chart-state-message'
import { TimeSeriesChart } from './time-series-chart/time-series-chart'
import { Sparkline } from './sparkline/sparkline'
import { MetricCardChart } from './metric-card-chart/metric-card-chart'
import { BarChart } from './bar-chart/bar-chart'
import { HistogramChart } from './histogram-chart/histogram-chart'
import { BoxPlotChart } from './box-plot-chart/box-plot-chart'
import { AreaChart } from './area-chart/area-chart'
import { VarianceChart } from './variance-chart/variance-chart'

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

const fallbackDimensions: ChartDimensions = {
  outerWidth: 520,
  outerHeight: 240,
  margin: {
    top: 16,
    right: 16,
    bottom: 24,
    left: 32,
  },
  innerWidth: 472,
  innerHeight: 200,
}

const isDimensionsSuccess = (
  result: Result<ChartDimensions, Readonly<{ readonly kind: 'InvalidChartDimensions'; readonly reason: string }>>,
): result is SuccessResult<ChartDimensions> => result.ok === true

const panelDimensions = (): ChartDimensions => {
  const dimensions = createChartDimensions(520, 240)

  return ifElse(
    isDimensionsSuccess,
    candidate => candidate.value,
    () => fallbackDimensions,
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

const caveatItem = (caveat: PresentationCaveatViewModel) => (
  <li key={`${caveat.kind}-${caveat.message}`} className={`chart-panel__caveat chart-panel__caveat--${caveat.severity}`}>
    <strong>{caveat.title}</strong>
    <span>{caveat.message}</span>
  </li>
)

const renderTimeSeriesPanel = (panel: TimeSeriesPanel): ReactNode => (
  <TimeSeriesChart
    viewModel={panel.chartViewModel}
    geometry={composeTimeSeriesChartGeometry(panel.chartViewModel, panelDimensions())}
  />
)

const renderSparklinePanel = (panel: SparklinePanel): ReactNode => (
  <Sparkline
    viewModel={panel.chartViewModel}
    geometry={composeSparklineGeometry(panel.chartViewModel, panelDimensions())}
  />
)

const renderMetricCardPanel = (panel: MetricCardPanel): ReactNode => <MetricCardChart viewModel={panel.chartViewModel} />
const renderBarChartPanel = (panel: BarChartPanel): ReactNode => <BarChart viewModel={panel.chartViewModel} />
const renderHistogramPanel = (panel: HistogramPanel): ReactNode => <HistogramChart viewModel={panel.chartViewModel} />
const renderBoxPlotPanel = (panel: BoxPlotPanel): ReactNode => <BoxPlotChart viewModel={panel.chartViewModel} />
const renderAreaChartPanel = (panel: AreaChartPanel): ReactNode => <AreaChart viewModel={panel.chartViewModel} />
const renderVarianceChartPanel = (panel: VarianceChartPanel): ReactNode => <VarianceChart viewModel={panel.chartViewModel} />

const renderUnknownPanel = (panel: ChartPanelViewModel): ReactNode => (
  <span className="chart-panel__visual-label">{panel.chartKind}</span>
)

const renderAfterAreaChart = (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isVarianceChartPanel, renderVarianceChartPanel, renderUnknownPanel)(panel)

const renderAfterBoxPlot = (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isAreaChartPanel, renderAreaChartPanel, renderAfterAreaChart)(panel)

const renderAfterHistogram = (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isBoxPlotPanel, renderBoxPlotPanel, renderAfterBoxPlot)(panel)

const renderAfterBarChart = (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isHistogramPanel, renderHistogramPanel, renderAfterHistogram)(panel)

const renderAfterMetricCard = (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isBarChartPanel, renderBarChartPanel, renderAfterBarChart)(panel)

const renderAfterSparkline = (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isMetricCardPanel, renderMetricCardPanel, renderAfterMetricCard)(panel)

const renderAfterTimeSeries = (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isSparklinePanel, renderSparklinePanel, renderAfterSparkline)(panel)

const renderChartPayload = (panel: ChartPanelViewModel): ReactNode =>
  ifElse(isTimeSeriesPanel, renderTimeSeriesPanel, renderAfterTimeSeries)(panel)

export function ChartPanel({ viewModel }: Readonly<{ readonly viewModel: ChartPanelViewModel }>) {
  return (
    <section className={`chart-panel chart-panel--${viewModel.chartKind}`} aria-label={viewModel.accessibilitySummary}>
      <header className="chart-panel__header">
        <div className="chart-panel__heading">
          <p className="chart-panel__kind">{viewModel.chartKind}</p>
          <h3 className="chart-panel__title">{viewModel.title}</h3>
        </div>
        <span className="chart-panel__state">{viewModel.state}</span>
      </header>
      <p className="chart-panel__description">{renderMaybeText('Chart state available.')(viewModel.description)}</p>
      <div className="chart-panel__visual" role="img" aria-label={viewModel.chartViewModel.accessibilitySummary}>
        {renderChartPayload(viewModel)}
      </div>
      <ChartStateMessage state={viewModel.state} />
      <ul className="chart-panel__caveats">{viewModel.caveats.map(caveatItem)}</ul>
    </section>
  )
}
