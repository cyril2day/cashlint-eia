import type { SummaryCardViewModel } from '@/presentation/contracts/summary-card-view-model'
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
  AppNavigationItemViewModel,
  AppNavigationViewModel,
  AppRouteId,
  HomePageViewModel,
  SummaryDisplayState,
  SummaryViewModel,
} from '@/presentation/contracts'
import type {
  AreaChartViewModel,
  ChartCaveatViewModel,
  HistogramViewModel,
  SparklineViewModel,
} from '@/presentation/charts/contracts'
import {
  mapContextualizedSignalToAreaChart,
  mapContextualizedSignalToHistogram,
  mapContextualizedSignalToSparkline,
  type HistoricalSignalPointInput,
} from '@/presentation/charts/mappers'
import { cond, ifElse } from '@/shared/fp'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'

const shortHistoryMessage = 'This view uses the weekly window returned by the current run. When the window is thin, the chart stays cautious instead of smoothing over the gaps.'

const activeRoute = (routeId: AppRouteId) => (candidate: AppRouteId): boolean => candidate === routeId

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

const routeDescription = (routeId: AppRouteId): Maybe<string> =>
  cond<[AppRouteId], Maybe<string>>([
    [candidate => candidate === 'home', () => some('The weekly read, controls, and the first pass of the story.')],
    [candidate => candidate === 'inventory', () => some('Storage levels, movement, and the caveats behind the read.')],
    [candidate => candidate === 'price', () => some('WTI context beside the physical market signals.')],
    [candidate => candidate === 'balance', () => some('What is pulling the weekly balance tighter or looser.')],
    [candidate => candidate === 'analysis', () => some('How the app arrived at the headline.')],
    [() => true, () => some('The chart workbench, with every visual type in one place.')],
  ])(routeId)

const routeHref = (routeId: AppRouteId): string =>
  cond<[AppRouteId], string>([
    [candidate => candidate === 'home', () => '/'],
    [candidate => candidate === 'inventory', () => '/inventory'],
    [candidate => candidate === 'price', () => '/price'],
    [candidate => candidate === 'balance', () => '/balance'],
    [candidate => candidate === 'analysis', () => '/analysis'],
    [() => true, () => '/charts'],
  ])(routeId)

const routeLabel = (routeId: AppRouteId): string =>
  cond<[AppRouteId], string>([
    [candidate => candidate === 'home', () => 'Home'],
    [candidate => candidate === 'inventory', () => 'Inventory'],
    [candidate => candidate === 'price', () => 'Price'],
    [candidate => candidate === 'balance', () => 'Balance'],
    [candidate => candidate === 'analysis', () => 'Analysis'],
    [() => true, () => 'Charts'],
  ])(routeId)

const navigationItem = (
  activeRouteId: AppRouteId,
) =>
  (routeId: AppRouteId): AppNavigationItemViewModel => ({
    routeId,
    label: routeLabel(routeId),
    href: routeHref(routeId),
    isActive: activeRoute(activeRouteId)(routeId),
    description: routeDescription(routeId),
  })

const appRouteIds: readonly AppRouteId[] = ['home', 'inventory', 'price', 'balance', 'analysis', 'charts']

export const createAppNavigationViewModel = (
  activeRouteId: AppRouteId,
): AppNavigationViewModel => ({
  items: appRouteIds.map(navigationItem(activeRouteId)),
})

export const createAnalysisControlViewModel = (summary: SummaryViewModel): AnalysisControlViewModel => ({
  reportWeekLabel: summary.reportWeekText,
  geographyLabel: summary.geographyText,
  comparisonWindowLabel: 'Latest weekly window',
  submitLabel: 'Refresh live data',
  helperText: some('Refreshes the configured weekly run and keeps the view grounded in the live feed.'),
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

const unavailableSparkline = (id: string, label: string): SparklineViewModel => ({
  id,
  label,
  points: [],
  currentPoint: none(),
  caveats: [chartCaveat],
  accessibilitySummary: `${label} sparkline is waiting on a usable weekly window.`,
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

const chartPanelDescription = (
  chartKind: ChartPanelKind,
): Maybe<string> =>
  cond<[ChartPanelKind], Maybe<string>>([
    [candidate => candidate === 'Sparkline', () => some('A compact WTI read for quick scanning.')],
    [candidate => candidate === 'Histogram', () => some('A light distribution view of the weekly WTI values that came back.')],
    [candidate => candidate === 'AreaChart', () => some('Inventory magnitude over the loaded weekly window.')],
    [() => true, () => some('Chart widget input for the current visualization workbench.')],
  ])(chartKind)

const chartPanel = (
  id: string,
  title: string,
  chartKind: ChartPanelKind,
  chartViewModel: ChartPanelViewModel['chartViewModel'],
): ChartPanelViewModel => ({
  id,
  title,
  description: chartPanelDescription(chartKind),
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

export const mapLiveAnalysisToChartsGalleryViewModel = (input: LiveChartsGalleryInput): ChartsGalleryViewModel => {
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
  const inventoryAreaChart = mapContextualizedSignalToAreaChart({
    id: 'inventory-area-chart',
    title: 'Inventory area chart',
    subtitle: some('Weekly inventory observations from the current run'),
    signal: input.signals.inventory,
    historicalPoints: input.inventoryHistory,
    baseline: none(),
  })
  const panels = [
    chartPanel('price-sparkline-panel', 'WTI weekly price trend', 'Sparkline', priceSparkline),
    chartPanel('price-histogram-panel', 'WTI weekly price distribution', 'Histogram', priceHistogram),
    chartPanel('inventory-area-panel', 'Weekly commercial crude inventory', 'AreaChart', inventoryAreaChart),
  ]

  return {
    title: `${input.summary.reportWeekText} charts`,
    description: '',
    stateSummary: chartGalleryStateSummary(panels),
    panels,
    caveats: [presentationHistoryCaveat],
    state: 'Partial',
  }
}

export const mapSummaryToChartsGalleryViewModel = (_summary: SummaryViewModel): ChartsGalleryViewModel => {
  const panels = [
    chartPanel('price-sparkline-panel', 'WTI weekly price trend', 'Sparkline', unavailableSparkline('price-sparkline', 'WTI price sparkline')),
    chartPanel('price-histogram-panel', 'WTI weekly price distribution', 'Histogram', unavailableHistogram('price-histogram', 'WTI distribution histogram')),
    chartPanel('inventory-area-panel', 'Weekly commercial crude inventory', 'AreaChart', unavailableAreaChart('inventory-area-chart', 'Inventory area chart')),
  ]

  return {
    title: 'Charts',
    description: '',
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
      ...panelsByKind(gallery, 'AreaChart'),
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
  _gallery: ChartsGalleryViewModel,
): BalanceDetailViewModel => {
  const balanceCards = summary.cards.filter(card => card.kind === 'system')

  return detailPage(
    'System balance',
    some('System balance summary without inactive chart widgets'),
    balanceCards,
    [],
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

export const mapSummaryToHomePageViewModel = (summary: SummaryViewModel): HomePageViewModel => {
  const gallery = mapSummaryToChartsGalleryViewModel(summary)

  return mapSummaryWithChartsToHomePageViewModel(summary, gallery)
}

export const mapSummaryWithChartsToHomePageViewModel = (
  summary: SummaryViewModel,
  gallery: ChartsGalleryViewModel,
): HomePageViewModel => ({
  summary,
  navigation: createAppNavigationViewModel('home'),
  controls: createAnalysisControlViewModel(summary),
  primaryCharts: [
    ...panelsByKind(gallery, 'Sparkline'),
    ...panelsByKind(gallery, 'Histogram'),
    ...panelsByKind(gallery, 'AreaChart'),
  ],
  chartsGallery: gallery,
  caveatPanel: createCaveatPanelViewModel(summary),
  tracePanel: createAnalysisTraceViewModel(summary),
  state: presentationStateFromSummaryState(summary.displayState),
})
