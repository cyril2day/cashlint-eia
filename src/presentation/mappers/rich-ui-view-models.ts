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

const historyDeferredMessage = 'Runtime historical-series loading is deferred, so this chart is shown as unavailable instead of inventing missing observations.'

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
  kind: 'runtime-history-deferred',
  title: 'Runtime history deferred',
  message: historyDeferredMessage,
  severity: 'info',
}

const presentationHistoryCaveat: PresentationCaveatViewModel = {
  kind: 'trend-not-computed',
  title: 'Runtime history deferred',
  message: historyDeferredMessage,
  severity: 'info',
}

const routeDescription = (routeId: ProductRouteId): Maybe<string> =>
  cond<[ProductRouteId], Maybe<string>>([
    [candidate => candidate === 'home', () => some('Weekly command surface and summary.')],
    [candidate => candidate === 'inventory', () => some('Inventory facts, caveats, and chart states.')],
    [candidate => candidate === 'price', () => some('WTI price facts, caveats, and chart states.')],
    [candidate => candidate === 'balance', () => some('System balance summary and driver states.')],
    [candidate => candidate === 'analysis', () => some('Reasoning trace, confidence, and synthesis.')],
    [() => true, () => some('All visible chart and widget types.')],
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
  comparisonWindowLabel: 'Latest available weekly comparison',
  submitLabel: 'Refresh live data',
  helperText: some('Advanced report-week search is deferred; refresh keeps the latest configured live workflow visible.'),
  fieldsDisabled: true,
})

export const createCaveatPanelViewModel = (summary: SummaryViewModel): CaveatPanelViewModel => ({
  title: 'Caveats and limitations',
  caveats: summary.caveats,
  state: caveatPanelState(summary),
  summary: ifElse(
    (candidate: SummaryViewModel) => candidate.caveats.length > 0,
    candidate => some(`${String(candidate.caveats.length)} caveat(s) are preserved from the analysis path.`),
    () => some('No presentation caveats were emitted for this view.'),
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
  traceStep('EIA data loaded', 'The route resolver uses the existing live summary boundary.', state),
  traceStep('ACL translation passed', 'Raw upstream rows stay outside presentation components.', state),
  traceStep('Weekly facts constructed', 'Measurement output is represented through display-safe summary cards.', state),
  traceStep('System Balance computed', 'System balance is visible when the summary card is available.', state),
  traceStep('Interpretation contextualized signals', 'Trend, baseline, anomaly, and caveats are already mapped upstream.', state),
  traceStep('Weekly Analysis composed', 'The headline, summary, confidence, and condition come from the application workflow.', state),
  traceStep('Presentation mapped', 'This rich UI layer renders serializable ViewModels only.', 'Complete'),
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
  valueLabel: 'Unavailable',
  unitLabel: none(),
  comparison: none(),
  trendLabel: none(),
  statusLabel: some('Unavailable'),
  caveats: [chartCaveat],
  sparkline: none(),
  accessibilitySummary: `${title} metric unavailable.`,
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
  subtitle: some('Historical loading deferred'),
  unitLabel: none(),
  points: [],
  currentPoint: none(),
  baseline: { kind: 'NotComputed', reason: historyDeferredMessage },
  anomaly: { kind: 'NotComputed', reason: historyDeferredMessage },
  caveats: [chartCaveat],
  accessibilitySummary: `${title} time series unavailable because runtime history is deferred.`,
  displayState: 'Unavailable',
})

const unavailableSparkline = (id: string, label: string): SparklineViewModel => ({
  id,
  label,
  points: [],
  currentPoint: none(),
  caveats: [chartCaveat],
  accessibilitySummary: `${label} sparkline unavailable because runtime history is deferred.`,
  displayState: 'Unavailable',
})

const unavailableBarChart = (id: string, title: string): BarChartViewModel => ({
  id,
  title,
  subtitle: some('Driver values are not exposed in the summary ViewModel.'),
  unitLabel: none(),
  ordering: 'InputOrder',
  points: [],
  caveats: [chartCaveat],
  accessibilitySummary: `${title} bar chart unavailable in this summary-only rich UI slice.`,
  displayState: 'Unavailable',
})

const unavailableHistogram = (id: string, title: string): HistogramViewModel => ({
  id,
  title,
  subtitle: some('Distribution requires runtime history.'),
  unitLabel: none(),
  values: [],
  binStrategy: { kind: 'Automatic', requestedBinCount: 6 },
  currentMarker: none(),
  referenceMarkers: [],
  caveats: [chartCaveat],
  accessibilitySummary: `${title} histogram unavailable because runtime history is deferred.`,
  displayState: 'Unavailable',
})

const unavailableBoxPlot = (id: string, title: string): BoxPlotViewModel => ({
  id,
  title,
  subtitle: some('Five-number summary requires runtime history.'),
  unitLabel: none(),
  summary: none(),
  outliers: [],
  currentMarker: none(),
  referenceMarkers: [],
  caveats: [chartCaveat],
  accessibilitySummary: `${title} box plot unavailable because runtime history is deferred.`,
  displayState: 'Unavailable',
})

const unavailableAreaChart = (id: string, title: string): AreaChartViewModel => ({
  id,
  title,
  subtitle: some('Area history requires runtime history.'),
  unitLabel: none(),
  points: [],
  baseline: none(),
  currentMarker: none(),
  referenceMarkers: [],
  caveats: [chartCaveat],
  accessibilitySummary: `${title} area chart unavailable because runtime history is deferred.`,
  displayState: 'Unavailable',
})

const unavailableVarianceChart = (id: string, title: string): VarianceChartViewModel => ({
  id,
  title,
  subtitle: some('Reference baseline requires interpreted historical context.'),
  unitLabel: none(),
  referenceSemantics: 'Baseline reference is not computed in the presentation layer.',
  entries: [],
  caveats: [chartCaveat],
  accessibilitySummary: `${title} variance chart unavailable because runtime history is deferred.`,
  displayState: 'Unavailable',
})

const chartPanel = (
  id: string,
  title: string,
  chartKind: ChartPanelKind,
  chartViewModel: ChartPanelViewModel['chartViewModel'],
): ChartPanelViewModel => ({
  id,
  title,
  description: some(historyDeferredMessage),
  chartKind,
  chartViewModel,
  state: chartViewModel.displayState,
  caveats: [presentationHistoryCaveat],
  accessibilitySummary: chartViewModel.accessibilitySummary,
})

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
    subtitle: some('Loaded weekly observations'),
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
    subtitle: some('Loaded weekly observations'),
    signal: input.signals.price,
    historicalPoints: input.priceHistory,
    binStrategy: { kind: 'Automatic', requestedBinCount: 6 },
  })
  const inventoryBoxPlot = partialBoxPlot(mapContextualizedSignalToBoxPlot({
    id: 'inventory-box-plot',
    title: 'Inventory box plot',
    subtitle: some('Five-number summary remains partial with the loaded runtime window'),
    signal: input.signals.inventory,
    historicalPoints: input.inventoryHistory,
    summary: none(),
    outliers: [],
  }))
  const inventoryAreaChart = mapContextualizedSignalToAreaChart({
    id: 'inventory-area-chart',
    title: 'Inventory area chart',
    subtitle: some('Loaded weekly observations'),
    signal: input.signals.inventory,
    historicalPoints: input.inventoryHistory,
    baseline: none(),
  })
  const balanceVariance = mapContextualizedSignalToVarianceChart({
    id: 'balance-variance-chart',
    title: 'Inventory baseline variance',
    subtitle: some('Reference baseline comes from interpretation context'),
    signal: input.signals.inventory,
    referenceLabel: 'Baseline',
    referenceSemantics: 'Interpretation baseline average',
  })

  return {
    title: 'Visual analysis gallery',
    description: 'All chart and widget types are visible; loaded runtime observations back the short-history charts.',
    panels: [
      chartPanel('inventory-time-series-panel', 'Inventory time series', 'TimeSeries', inventoryTimeSeries),
      chartPanel('price-sparkline-panel', 'WTI sparkline', 'Sparkline', priceSparkline),
      chartPanel('inventory-metric-panel', 'Inventory metric card', 'MetricCard', inventoryMetric),
      chartPanel('balance-driver-panel', 'Balance driver bars', 'BarChart', balanceBarChart(input)),
      chartPanel('price-histogram-panel', 'WTI distribution histogram', 'Histogram', priceHistogram),
      chartPanel('inventory-box-panel', 'Inventory box plot', 'BoxPlot', inventoryBoxPlot),
      chartPanel('inventory-area-panel', 'Inventory area chart', 'AreaChart', inventoryAreaChart),
      chartPanel('balance-variance-panel', 'Balance variance chart', 'VarianceChart', balanceVariance),
    ],
    caveats: [presentationHistoryCaveat],
    state: 'Partial',
  }
}

export const mapSummaryToChartsGalleryViewModel = (summary: SummaryViewModel): ChartsGalleryViewModel => {
  const inventoryMetric = metricCardFromMaybe('Inventory')(summaryCardByKind(summary, 'inventory'))

  return {
    title: 'Visual analysis gallery',
    description: 'All chart and widget types are visible with honest complete, partial, and unavailable states.',
    panels: [
      chartPanel('inventory-time-series-panel', 'Inventory time series', 'TimeSeries', unavailableTimeSeries('inventory-time-series', 'Inventory time series')),
      chartPanel('price-sparkline-panel', 'WTI sparkline', 'Sparkline', unavailableSparkline('price-sparkline', 'WTI price sparkline')),
      chartPanel('inventory-metric-panel', 'Inventory metric card', 'MetricCard', inventoryMetric),
      chartPanel('balance-driver-panel', 'Balance driver bars', 'BarChart', unavailableBarChart('balance-driver-bars', 'Balance driver bars')),
      chartPanel('price-histogram-panel', 'WTI distribution histogram', 'Histogram', unavailableHistogram('price-histogram', 'WTI distribution histogram')),
      chartPanel('inventory-box-panel', 'Inventory box plot', 'BoxPlot', unavailableBoxPlot('inventory-box-plot', 'Inventory box plot')),
      chartPanel('inventory-area-panel', 'Inventory area chart', 'AreaChart', unavailableAreaChart('inventory-area-chart', 'Inventory area chart')),
      chartPanel('balance-variance-panel', 'Balance variance chart', 'VarianceChart', unavailableVarianceChart('balance-variance-chart', 'Balance variance chart')),
    ],
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
    some('Price signal, caveats, and deferred history states'),
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
