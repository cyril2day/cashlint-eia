import type { SummaryCardKind, SummaryCardViewModel } from '@/presentation/contracts/summary-card-view-model'
import type { ContextualizedSignalSet } from '@/contexts/interpretation/model/current-signal-set'
import type { SystemBalanceAnalysis } from '@/contexts/system-balance/model'
import type {
  AnalysisControlViewModel,
  AnalysisDetailViewModel,
  AnalysisTraceStepViewModel,
  AnalysisTraceViewModel,
  BalanceDetailViewModel,
  CaveatPanelViewModel,
  ChartPanelKind,
  ChartPanelViewModel,
  ChartGalleryStateSummaryItemViewModel,
  ChartsGalleryViewModel,
  DetailPageViewModel,
  DetailRowViewModel,
  InventoryDetailViewModel,
  PresentationCaveatViewModel,
  PresentationDisplayState,
  PriceDetailViewModel,
  ProductNavigationItemViewModel,
  ProductNavigationViewModel,
  ProductRouteId,
  RichHomeViewModel,
  SummaryDisplayState,
  SummaryViewModel,
} from '@/presentation/contracts'
import type {
  AreaChartViewModel,
  BarChartViewModel,
  BoxPlotViewModel,
  ChartCaveatViewModel,
  HistogramViewModel,
  MetricCardViewModel,
  SparklineViewModel,
  TimeSeriesChartViewModel,
  VarianceChartViewModel,
} from '@/presentation/charts/contracts'
import {
  mapContextualizedSignalToAreaChart,
  mapContextualizedSignalToBoxPlot,
  mapContextualizedSignalToHistogram,
  mapContextualizedSignalToSparkline,
  mapContextualizedSignalToStandaloneMetricCard,
  mapContextualizedSignalToTimeSeriesChart,
  mapContextualizedSignalToVarianceChart,
  mapSystemBalanceAnalysisToDriverBarChart,
  type HistoricalSignalPointInput,
} from '@/presentation/charts/mappers'
import { cond, ifElse } from '@/shared/fp'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'

const shortHistoryMessage = 'This view uses the weekly window returned by the current run. When the window is thin, the chart stays cautious instead of smoothing over the gaps.'

const activeRoute = (routeId: ProductRouteId) => (candidate: ProductRouteId): boolean => candidate === routeId

const maybeFirst = <Value>(values: readonly Value[]): Maybe<Value> =>
  ifElse(
    (candidate: readonly Value[]) => candidate.length > 0,
    candidate => some(candidate[0]),
    () => none(),
  )(values)

const presentationStateFromSummaryState = (state: SummaryDisplayState): PresentationDisplayState =>
  cond<[SummaryDisplayState], PresentationDisplayState>([
    [candidate => candidate === 'complete', () => 'Complete'],
    [candidate => candidate === 'partial', () => 'Partial'],
    [candidate => candidate === 'empty', () => 'Empty'],
    [() => true, () => 'Error'],
  ])(state)

const caveatPanelState = (summary: SummaryViewModel): PresentationDisplayState =>
  ifElse(
    (candidate: SummaryViewModel) => candidate.caveats.length > 0,
    (): PresentationDisplayState => 'Partial',
    (): PresentationDisplayState => 'Complete',
  )(summary)

const chartCaveat: ChartCaveatViewModel = {
  kind: 'short-history-window',
  title: 'Short history window',
  message: shortHistoryMessage,
  severity: 'info',
}

const presentationHistoryCaveat: PresentationCaveatViewModel = {
  kind: 'short-history-window',
  title: 'Short history window',
  message: shortHistoryMessage,
  severity: 'info',
}

const presentationCaveatSeverityFromChartCaveat = (
  caveat: ChartCaveatViewModel,
): PresentationCaveatViewModel['severity'] =>
  cond<[ChartCaveatViewModel], PresentationCaveatViewModel['severity']>([
    [candidate => candidate.severity === 'info', () => 'info'],
    [() => true, () => 'warning'],
  ])(caveat)

const presentationKindFromChartCaveat = (
  caveat: ChartCaveatViewModel,
): PresentationCaveatViewModel['kind'] =>
  cond<[ChartCaveatViewModel], PresentationCaveatViewModel['kind']>([
    [candidate => candidate.kind === 'short-history-window', () => 'short-history-window'],
    [candidate => candidate.kind === 'TrendNotComputed', () => 'trend-not-computed'],
    [candidate => candidate.kind === 'AnomalyNotComputed', () => 'anomaly-not-computed'],
    [candidate => candidate.kind === 'ComparisonWindowUnavailable', () => 'comparison-window-unavailable'],
    [() => true, () => 'chart-caveat'],
  ])(caveat)

const chartCaveatToPresentationCaveat = (
  caveat: ChartCaveatViewModel,
): PresentationCaveatViewModel => ({
  kind: presentationKindFromChartCaveat(caveat),
  title: caveat.title,
  message: caveat.message,
  severity: presentationCaveatSeverityFromChartCaveat(caveat),
})

const chartPanelCaveats = (
  chartViewModel: ChartPanelViewModel['chartViewModel'],
): readonly PresentationCaveatViewModel[] =>
  chartViewModel.caveats.map(chartCaveatToPresentationCaveat)

const routeDescription = (routeId: ProductRouteId): Maybe<string> =>
  cond<[ProductRouteId], Maybe<string>>([
    [candidate => candidate === 'home', () => some('The weekly read, controls, and the first pass of the story.')],
    [candidate => candidate === 'inventory', () => some('Storage levels, movement, and the caveats behind the read.')],
    [candidate => candidate === 'price', () => some('WTI context beside the physical market signals.')],
    [candidate => candidate === 'balance', () => some('What is pulling the weekly balance tighter or looser.')],
    [candidate => candidate === 'analysis', () => some('How the app arrived at the headline.')],
    [() => true, () => some('The chart workbench, with every visual type in one place.')],
  ])(routeId)

const routeHref = (routeId: ProductRouteId): string =>
  cond<[ProductRouteId], string>([
    [candidate => candidate === 'home', () => '/'],
    [candidate => candidate === 'inventory', () => '/inventory'],
    [candidate => candidate === 'price', () => '/price'],
    [candidate => candidate === 'balance', () => '/balance'],
    [candidate => candidate === 'analysis', () => '/analysis'],
    [() => true, () => '/charts'],
  ])(routeId)

const routeLabel = (routeId: ProductRouteId): string =>
  cond<[ProductRouteId], string>([
    [candidate => candidate === 'home', () => 'Home'],
    [candidate => candidate === 'inventory', () => 'Inventory'],
    [candidate => candidate === 'price', () => 'Price'],
    [candidate => candidate === 'balance', () => 'Balance'],
    [candidate => candidate === 'analysis', () => 'Analysis'],
    [() => true, () => 'Charts'],
  ])(routeId)

const navigationItem = (
  activeRouteId: ProductRouteId,
) =>
  (routeId: ProductRouteId): ProductNavigationItemViewModel => ({
    routeId,
    label: routeLabel(routeId),
    href: routeHref(routeId),
    isActive: activeRoute(activeRouteId)(routeId),
    description: routeDescription(routeId),
  })

const productRouteIds: readonly ProductRouteId[] = ['home', 'inventory', 'price', 'balance', 'analysis', 'charts']

export const createProductNavigationViewModel = (
  activeRouteId: ProductRouteId,
): ProductNavigationViewModel => ({
  items: productRouteIds.map(navigationItem(activeRouteId)),
})

export const createAnalysisControlViewModel = (summary: SummaryViewModel): AnalysisControlViewModel => ({
  reportWeekLabel: summary.reportWeekText,
  geographyLabel: summary.geographyText,
  comparisonWindowLabel: 'Latest weekly window',
  submitLabel: 'Refresh live data',
  helperText: some('For now this refreshes the configured weekly run. Date search can come later; the current view stays grounded in the live feed.'),
  fieldsDisabled: true,
})

export const createCaveatPanelViewModel = (summary: SummaryViewModel): CaveatPanelViewModel => ({
  title: 'Caveats and limitations',
  caveats: summary.caveats,
  state: caveatPanelState(summary),
  summary: ifElse(
    (candidate: SummaryViewModel) => candidate.caveats.length > 0,
    candidate => some(`${String(candidate.caveats.length)} note(s) came through with the analysis. They are shown here instead of being hidden in the fine print.`),
    () => some('No caveats came through for this view. That is a good quiet signal, not a guarantee.'),
  )(summary),
})

const traceStep = (
  label: string,
  description: string,
  status: PresentationDisplayState,
): AnalysisTraceStepViewModel => ({
  label,
  description,
  status,
  caveats: none(),
})

const traceSteps = (state: PresentationDisplayState): readonly AnalysisTraceStepViewModel[] => [
  traceStep('EIA data loaded', 'The app asked EIA for the configured weekly window.', state),
  traceStep('Rows cleaned at the boundary', 'Raw API rows were translated before they reached the UI.', state),
  traceStep('Weekly facts built', 'Inventory, price, refinery, and supply readings were shaped into petroleum facts.', state),
  traceStep('Balance read prepared', 'The physical balance was summarized before presentation touched it.', state),
  traceStep('Signals put in context', 'Trend, baseline, anomaly, and caveats were handled upstream.', state),
  traceStep('Weekly story composed', 'The headline, summary, confidence, and condition came from the analysis workflow.', state),
  traceStep('Display model prepared', 'The page received display-safe data: labels, states, chart payloads, and caveats.', 'Complete'),
]

export const createAnalysisTraceViewModel = (summary: SummaryViewModel): AnalysisTraceViewModel => ({
  title: 'Analysis production trace',
  steps: traceSteps(presentationStateFromSummaryState(summary.displayState)),
})

const summaryCardByKind = (
  summary: SummaryViewModel,
  kind: SummaryCardKind,
): Maybe<SummaryCardViewModel> => maybeFirst(summary.cards.filter(card => card.kind === kind))

const fallbackMetricCard = (title: string): MetricCardViewModel => ({
  id: `${title.toLowerCase().replaceAll(' ', '-')}-metric`,
  title,
  valueLabel: 'Not in this run',
  unitLabel: none(),
  comparison: none(),
  trendLabel: none(),
  statusLabel: some('Waiting on data'),
  caveats: [chartCaveat],
  sparkline: none(),
  accessibilitySummary: `${title} metric was not included in this run.`,
  displayState: 'Unavailable',
})

const metricCardFromSummaryCard = (card: SummaryCardViewModel): MetricCardViewModel => ({
  id: `${card.kind}-metric`,
  title: card.title,
  valueLabel: card.valueText,
  unitLabel: none(),
  comparison: none(),
  trendLabel: card.trendLabel,
  statusLabel: some(card.statusLabel),
  caveats: [],
  sparkline: none(),
  accessibilitySummary: `${card.title}, ${card.valueText}, ${card.statusLabel}.`,
  displayState: 'Complete',
})

const metricCardFromMaybe = (
  title: string,
) =>
  (card: Maybe<SummaryCardViewModel>): MetricCardViewModel =>
    matchMaybe<SummaryCardViewModel, MetricCardViewModel>({
      Some: metricCardFromSummaryCard,
      None: () => fallbackMetricCard(title),
    })(card)

const unavailableTimeSeries = (id: string, title: string): TimeSeriesChartViewModel => ({
  id,
  title,
  subtitle: some('Waiting for a usable weekly window'),
  unitLabel: none(),
  points: [],
  currentPoint: none(),
  baseline: { kind: 'NotComputed', reason: shortHistoryMessage },
  anomaly: { kind: 'NotComputed', reason: shortHistoryMessage },
  caveats: [chartCaveat],
  accessibilitySummary: `${title} time series is waiting on a usable weekly window.`,
  displayState: 'Unavailable',
})

const unavailableSparkline = (id: string, label: string): SparklineViewModel => ({
  id,
  label,
  points: [],
  currentPoint: none(),
  caveats: [chartCaveat],
  accessibilitySummary: `${label} sparkline is waiting on a usable weekly window.`,
  displayState: 'Unavailable',
})

const unavailableBarChart = (id: string, title: string): BarChartViewModel => ({
  id,
  title,
  subtitle: some('Driver values did not come through with this run.'),
  unitLabel: none(),
  ordering: 'InputOrder',
  points: [],
  caveats: [chartCaveat],
  accessibilitySummary: `${title} bar chart is waiting on driver values.`,
  displayState: 'Unavailable',
})

const unavailableHistogram = (id: string, title: string): HistogramViewModel => ({
  id,
  title,
  subtitle: some('Needs a wider weekly window.'),
  unitLabel: none(),
  values: [],
  binStrategy: { kind: 'Automatic', requestedBinCount: 6 },
  currentMarker: none(),
  referenceMarkers: [],
  caveats: [chartCaveat],
  accessibilitySummary: `${title} histogram is waiting on more weekly values.`,
  displayState: 'Unavailable',
})

const unavailableBoxPlot = (id: string, title: string): BoxPlotViewModel => ({
  id,
  title,
  subtitle: some('Needs enough observations for a fair spread.'),
  unitLabel: none(),
  summary: none(),
  outliers: [],
  currentMarker: none(),
  referenceMarkers: [],
  caveats: [chartCaveat],
  accessibilitySummary: `${title} box plot is waiting on enough observations for a fair spread.`,
  displayState: 'Unavailable',
})

const unavailableAreaChart = (id: string, title: string): AreaChartViewModel => ({
  id,
  title,
  subtitle: some('Needs weekly points before the shape means anything.'),
  unitLabel: none(),
  points: [],
  baseline: none(),
  currentMarker: none(),
  referenceMarkers: [],
  caveats: [chartCaveat],
  accessibilitySummary: `${title} area chart is waiting on weekly points.`,
  displayState: 'Unavailable',
})

const unavailableVarianceChart = (id: string, title: string): VarianceChartViewModel => ({
  id,
  title,
  subtitle: some('Needs a baseline before the comparison is fair.'),
  unitLabel: none(),
  referenceSemantics: 'Baseline reference comes from interpretation, not from the chart.',
  entries: [],
  caveats: [chartCaveat],
  accessibilitySummary: `${title} variance chart is waiting on a baseline reference.`,
  displayState: 'Unavailable',
})

const chartPanelDescription = (
  chartKind: ChartPanelKind,
  state: PresentationDisplayState,
): Maybe<string> =>
  cond<[ChartPanelKind], Maybe<string>>([
    [candidate => candidate === 'TimeSeries', () => some('A week-by-week line for the loaded inventory window.')],
    [candidate => candidate === 'Sparkline', () => some('A compact WTI read for quick scanning.')],
    [candidate => candidate === 'MetricCard', () => some('The current value, kept close to its status and caveats.')],
    [candidate => candidate === 'BarChart', () => some('Balance drivers shown side by side, without turning them into a verdict.')],
    [candidate => candidate === 'Histogram', () => some('A light distribution view of the weekly WTI values that came back.')],
    [candidate => candidate === 'BoxPlot', () => ifElse(
      (candidateState: PresentationDisplayState) => candidateState === 'Partial',
      () => some('The shape is intentionally restrained until the weekly range is deep enough.'),
      () => some('A compact spread view for the loaded weekly range.'),
    )(state)],
    [candidate => candidate === 'AreaChart', () => some('Inventory magnitude over the loaded weekly window.')],
    [() => true, () => some('Current value against a baseline when interpretation has enough history to supply one.')],
  ])(chartKind)

const chartPanel = (
  id: string,
  title: string,
  chartKind: ChartPanelKind,
  chartViewModel: ChartPanelViewModel['chartViewModel'],
): ChartPanelViewModel => ({
  id,
  title,
  description: chartPanelDescription(chartKind, chartViewModel.displayState),
  chartKind,
  chartViewModel,
  state: chartViewModel.displayState,
  caveats: chartPanelCaveats(chartViewModel),
  accessibilitySummary: chartViewModel.accessibilitySummary,
})

const chartStateLabel = (state: PresentationDisplayState): string =>
  cond<[PresentationDisplayState], string>([
    [candidate => candidate === 'Complete', () => 'Ready'],
    [candidate => candidate === 'Partial', () => 'Cautious'],
    [candidate => candidate === 'Unavailable', () => 'Waiting'],
    [candidate => candidate === 'NotComputed', () => 'Needs history'],
    [candidate => candidate === 'Empty', () => 'No rows'],
    [() => true, () => 'Review'],
  ])(state)

const chartStateDescription = (state: PresentationDisplayState): string =>
  cond<[PresentationDisplayState], string>([
    [candidate => candidate === 'Complete', () => 'Enough data came through for the panel to speak clearly.'],
    [candidate => candidate === 'Partial', () => 'Useful, but still carrying caveats worth reading.'],
    [candidate => candidate === 'Unavailable', () => 'The current run did not return what this panel needs.'],
    [candidate => candidate === 'NotComputed', () => 'The source data exists, but the comparison would be overstated.'],
    [candidate => candidate === 'Empty', () => 'No usable rows landed in this visual.'],
    [() => true, () => 'The panel stayed visible, but its display state needs attention.'],
  ])(state)

const chartPanelCountByState =
  (state: PresentationDisplayState) =>
  (panels: readonly ChartPanelViewModel[]): number =>
    panels.filter(panel => panel.state === state).length

const chartGalleryStateSummaryItem =
  (panels: readonly ChartPanelViewModel[]) =>
  (state: PresentationDisplayState): ChartGalleryStateSummaryItemViewModel => ({
    state,
    label: chartStateLabel(state),
    valueLabel: String(chartPanelCountByState(state)(panels)),
    description: chartStateDescription(state),
  })

const chartGallerySummaryStates: readonly PresentationDisplayState[] = [
  'Complete',
  'Partial',
  'Unavailable',
  'NotComputed',
]

const chartGalleryStateSummary = (
  panels: readonly ChartPanelViewModel[],
): readonly ChartGalleryStateSummaryItemViewModel[] =>
  chartGallerySummaryStates.map(chartGalleryStateSummaryItem(panels))

type LiveChartsGalleryInput = Readonly<{
  readonly summary: SummaryViewModel
  readonly signals: ContextualizedSignalSet
  readonly systemBalance: Maybe<SystemBalanceAnalysis>
  readonly inventoryHistory: readonly HistoricalSignalPointInput[]
  readonly priceHistory: readonly HistoricalSignalPointInput[]
}>

const partialBoxPlot = (viewModel: BoxPlotViewModel): BoxPlotViewModel => ({
  ...viewModel,
  displayState: 'Partial',
})

const balanceBarChart = (input: LiveChartsGalleryInput): BarChartViewModel =>
  matchMaybe<SystemBalanceAnalysis, BarChartViewModel>({
    Some: analysis => mapSystemBalanceAnalysisToDriverBarChart({
      id: 'balance-driver-bars',
      title: 'Balance driver bars',
      analysis,
    }),
    None: () => unavailableBarChart('balance-driver-bars', 'Balance driver bars'),
  })(input.systemBalance)

export const mapLiveAnalysisToChartsGalleryViewModel = (input: LiveChartsGalleryInput): ChartsGalleryViewModel => {
  const inventoryMetric = mapContextualizedSignalToStandaloneMetricCard({
    id: 'inventory-metric',
    title: 'Inventory metric card',
    signal: input.signals.inventory,
  })
  const inventoryTimeSeries = mapContextualizedSignalToTimeSeriesChart({
    id: 'inventory-time-series',
    title: 'Inventory time series',
    subtitle: some('Weekly inventory observations from the current run'),
    signal: input.signals.inventory,
    historicalPoints: input.inventoryHistory,
  })
  const priceSparkline = mapContextualizedSignalToSparkline({
    id: 'price-sparkline',
    label: 'WTI price sparkline',
    signal: input.signals.price,
    historicalPoints: input.priceHistory,
  })
  const priceHistogram = mapContextualizedSignalToHistogram({
    id: 'price-histogram',
    title: 'WTI distribution histogram',
    subtitle: some('Weekly WTI observations from the current run'),
    signal: input.signals.price,
    historicalPoints: input.priceHistory,
    binStrategy: { kind: 'Automatic', requestedBinCount: 6 },
  })
  const inventoryBoxPlot = partialBoxPlot(mapContextualizedSignalToBoxPlot({
    id: 'inventory-box-plot',
    title: 'Inventory box plot',
    subtitle: some('A box plot needs a deeper weekly range than this run returned'),
    signal: input.signals.inventory,
    historicalPoints: input.inventoryHistory,
    summary: none(),
    outliers: [],
  }))
  const inventoryAreaChart = mapContextualizedSignalToAreaChart({
    id: 'inventory-area-chart',
    title: 'Inventory area chart',
    subtitle: some('Weekly inventory observations from the current run'),
    signal: input.signals.inventory,
    historicalPoints: input.inventoryHistory,
    baseline: none(),
  })
  const balanceVariance = mapContextualizedSignalToVarianceChart({
    id: 'balance-variance-chart',
    title: 'Inventory baseline variance',
    subtitle: some('Baseline reference comes from interpretation context'),
    signal: input.signals.inventory,
    referenceLabel: 'Baseline',
    referenceSemantics: 'Interpretation baseline average',
  })
  const panels = [
    chartPanel('inventory-time-series-panel', 'Inventory time series', 'TimeSeries', inventoryTimeSeries),
    chartPanel('price-sparkline-panel', 'WTI sparkline', 'Sparkline', priceSparkline),
    chartPanel('inventory-metric-panel', 'Inventory metric card', 'MetricCard', inventoryMetric),
    chartPanel('balance-driver-panel', 'Balance driver bars', 'BarChart', balanceBarChart(input)),
    chartPanel('price-histogram-panel', 'WTI distribution histogram', 'Histogram', priceHistogram),
    chartPanel('inventory-box-panel', 'Inventory box plot', 'BoxPlot', inventoryBoxPlot),
    chartPanel('inventory-area-panel', 'Inventory area chart', 'AreaChart', inventoryAreaChart),
    chartPanel('balance-variance-panel', 'Balance variance chart', 'VarianceChart', balanceVariance),
  ]

  return {
    title: 'Visual analysis gallery',
    description: 'A single place to inspect the market read: what is backed by the current weekly window, and what is still too thin to overstate.',
    stateSummary: chartGalleryStateSummary(panels),
    panels,
    caveats: [presentationHistoryCaveat],
    state: 'Partial',
  }
}

export const mapSummaryToChartsGalleryViewModel = (summary: SummaryViewModel): ChartsGalleryViewModel => {
  const inventoryMetric = metricCardFromMaybe('Inventory')(summaryCardByKind(summary, 'inventory'))
  const panels = [
    chartPanel('inventory-time-series-panel', 'Inventory time series', 'TimeSeries', unavailableTimeSeries('inventory-time-series', 'Inventory time series')),
    chartPanel('price-sparkline-panel', 'WTI sparkline', 'Sparkline', unavailableSparkline('price-sparkline', 'WTI price sparkline')),
    chartPanel('inventory-metric-panel', 'Inventory metric card', 'MetricCard', inventoryMetric),
    chartPanel('balance-driver-panel', 'Balance driver bars', 'BarChart', unavailableBarChart('balance-driver-bars', 'Balance driver bars')),
    chartPanel('price-histogram-panel', 'WTI distribution histogram', 'Histogram', unavailableHistogram('price-histogram', 'WTI distribution histogram')),
    chartPanel('inventory-box-panel', 'Inventory box plot', 'BoxPlot', unavailableBoxPlot('inventory-box-plot', 'Inventory box plot')),
    chartPanel('inventory-area-panel', 'Inventory area chart', 'AreaChart', unavailableAreaChart('inventory-area-chart', 'Inventory area chart')),
    chartPanel('balance-variance-panel', 'Balance variance chart', 'VarianceChart', unavailableVarianceChart('balance-variance-chart', 'Balance variance chart')),
  ]

  return {
    title: 'Visual analysis gallery',
    description: 'A single place to inspect every visual surface, including the places where the data is still too thin to push harder.',
    stateSummary: chartGalleryStateSummary(panels),
    panels,
    caveats: [presentationHistoryCaveat],
    state: 'Partial',
  }
}

const rowFromCard = (card: SummaryCardViewModel): DetailRowViewModel => ({
  label: card.title,
  value: card.valueText,
  unit: none(),
  status: some(card.statusLabel),
  description: card.subtitleText,
  caveats: matchMaybe<string, Maybe<readonly PresentationCaveatViewModel[]>>({
    Some: message => some([{
      kind: 'trend-not-computed',
      title: 'Card caveat',
      message,
      severity: 'warning',
    }]),
    None: () => none(),
  })(card.caveatLabel),
})

const detailRowsFromCards = (cards: readonly SummaryCardViewModel[]): readonly DetailRowViewModel[] =>
  cards.map(rowFromCard)

const detailPage = (
  title: string,
  headline: Maybe<string>,
  cards: readonly SummaryCardViewModel[],
  charts: readonly ChartPanelViewModel[],
  summary: SummaryViewModel,
): DetailPageViewModel => ({
  title,
  subtitle: some(`${summary.reportWeekText} · ${summary.geographyText}`),
  headline,
  cards,
  rows: detailRowsFromCards(cards),
  charts,
  caveats: summary.caveats,
  state: presentationStateFromSummaryState(summary.displayState),
  accessibilitySummary: `${title} page for ${summary.reportWeekText}, ${summary.geographyText}.`,
})

const panelsByKind = (
  gallery: ChartsGalleryViewModel,
  kind: ChartPanelKind,
): readonly ChartPanelViewModel[] => gallery.panels.filter(panel => panel.chartKind === kind)

export const mapSummaryToInventoryDetailViewModel = (summary: SummaryViewModel): InventoryDetailViewModel => {
  const gallery = mapSummaryToChartsGalleryViewModel(summary)

  return mapSummaryWithChartsToInventoryDetailViewModel(summary, gallery)
}

export const mapSummaryWithChartsToInventoryDetailViewModel = (
  summary: SummaryViewModel,
  gallery: ChartsGalleryViewModel,
): InventoryDetailViewModel => {
  const inventoryCards = summary.cards.filter(card => card.kind === 'inventory')

  return detailPage(
    'Inventory',
    some('Inventory facts and visual states'),
    inventoryCards,
    [
      ...panelsByKind(gallery, 'TimeSeries'),
      ...panelsByKind(gallery, 'MetricCard'),
      ...panelsByKind(gallery, 'AreaChart'),
      ...panelsByKind(gallery, 'BoxPlot'),
    ],
    summary,
  )
}

export const mapSummaryToPriceDetailViewModel = (summary: SummaryViewModel): PriceDetailViewModel => {
  const gallery = mapSummaryToChartsGalleryViewModel(summary)

  return mapSummaryWithChartsToPriceDetailViewModel(summary, gallery)
}

export const mapSummaryWithChartsToPriceDetailViewModel = (
  summary: SummaryViewModel,
  gallery: ChartsGalleryViewModel,
): PriceDetailViewModel => {
  const priceCards = summary.cards.filter(card => card.kind === 'price')

  return detailPage(
    'WTI price',
    some('WTI context, caveats, and the weekly window behind the move'),
    priceCards,
    [
      ...panelsByKind(gallery, 'Sparkline'),
      ...panelsByKind(gallery, 'Histogram'),
      ...panelsByKind(gallery, 'TimeSeries'),
    ],
    summary,
  )
}

export const mapSummaryToBalanceDetailViewModel = (summary: SummaryViewModel): BalanceDetailViewModel => {
  const gallery = mapSummaryToChartsGalleryViewModel(summary)

  return mapSummaryWithChartsToBalanceDetailViewModel(summary, gallery)
}

export const mapSummaryWithChartsToBalanceDetailViewModel = (
  summary: SummaryViewModel,
  gallery: ChartsGalleryViewModel,
): BalanceDetailViewModel => {
  const balanceCards = summary.cards.filter(card => card.kind === 'system')

  return detailPage(
    'System balance',
    some('System balance summary and driver chart states'),
    balanceCards,
    [
      ...panelsByKind(gallery, 'BarChart'),
      ...panelsByKind(gallery, 'VarianceChart'),
    ],
    summary,
  )
}

export const mapSummaryToAnalysisDetailViewModel = (summary: SummaryViewModel): AnalysisDetailViewModel =>
  mapSummaryWithChartsToAnalysisDetailViewModel(summary, mapSummaryToChartsGalleryViewModel(summary))

export const mapSummaryWithChartsToAnalysisDetailViewModel = (
  summary: SummaryViewModel,
  gallery: ChartsGalleryViewModel,
): AnalysisDetailViewModel =>
  detailPage(
    'Weekly analysis',
    some(summary.headline),
    summary.cards,
    gallery.panels,
    summary,
  )

export const mapSummaryToRichHomeViewModel = (summary: SummaryViewModel): RichHomeViewModel => {
  const gallery = mapSummaryToChartsGalleryViewModel(summary)

  return mapSummaryWithChartsToRichHomeViewModel(summary, gallery)
}

export const mapSummaryWithChartsToRichHomeViewModel = (
  summary: SummaryViewModel,
  gallery: ChartsGalleryViewModel,
): RichHomeViewModel => ({
  summary,
  navigation: createProductNavigationViewModel('home'),
  controls: createAnalysisControlViewModel(summary),
  primaryCharts: [
    ...panelsByKind(gallery, 'MetricCard'),
    ...panelsByKind(gallery, 'Sparkline'),
    ...panelsByKind(gallery, 'TimeSeries'),
  ],
  chartsGallery: gallery,
  caveatPanel: createCaveatPanelViewModel(summary),
  tracePanel: createAnalysisTraceViewModel(summary),
  state: presentationStateFromSummaryState(summary.displayState),
})
