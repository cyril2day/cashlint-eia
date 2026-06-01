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
  ChartGalleryControlsViewModel,
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
  BalanceSnapshotViewModel,
  DashboardMetricViewModel,
  DetailContentSectionViewModel,
  HomePageViewModel,
  HomeHeroViewModel,
  HomeNavigationCardViewModel,
  HomeReportWeekControlViewModel,
  SummaryDisplayState,
  SummaryViewModel,
} from '@/presentation/contracts'
import type {
  AreaChartViewModel,
  BarChartViewModel,
  BoxPlotMarkerViewModel,
  BoxPlotViewModel,
  ChartCaveatViewModel,
  FiveNumberSummaryViewModel,
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
  mapContextualizedSignalToStandaloneMetricCard,
  mapContextualizedSignalToSparkline,
  mapContextualizedSignalToTimeSeriesChart,
  mapContextualizedSignalToVarianceChart,
  mapSystemBalanceAnalysisToDriverBarChart,
  type HistoricalSignalPointInput,
} from '@/presentation/charts/mappers'
import { homeMetricChartFromCard, type HomeMetricChartHistoryInput } from '@/presentation/mappers/home-metric-chart-view-model'
import { cond, ifElse } from '@/shared/fp'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'
import { isNonEmptyArray, firstArrayItem } from '@/shared/collection'
import { currentIsoDate, formatDateIsoDate, formatDateReadable, parseDate, type DateParseError, type DateValue } from '@/shared/date'
import { isSuccess, type Result } from '@/shared/result'

const shortHistoryMessage = 'The statistical sample window is limited to the weekly rows returned by the current run. When that window is thin, trend, baseline, variance, and anomaly calls stay cautious.'

const activeRoute = (routeId: AppRouteId) => (candidate: AppRouteId): boolean => candidate === routeId

const appendReportWeekToHref =
  (reportWeekIso: Maybe<string>) =>
  (href: string): string =>
    matchMaybe<string, string>({
      Some: value => `${href}?reportWeek=${encodeURIComponent(value)}`,
      None: () => href,
    })(reportWeekIso)

const appendReportWeekToMaybeHref =
  (reportWeekIso: Maybe<string>) =>
  (href: Maybe<string>): Maybe<string> =>
    matchMaybe<string, Maybe<string>>({
      Some: value => some(appendReportWeekToHref(reportWeekIso)(value)),
      None: () => none(),
    })(href)

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
    [candidate => candidate === 'home', () => some('The analyst briefing, evidence cards, and first statistical read.')],
    [candidate => candidate === 'inventory', () => some('Commercial crude stock levels, movement, and caveats.')],
    [candidate => candidate === 'price', () => some('WTI spot price context beside the physical market signals.')],
    [candidate => candidate === 'balance', () => some('The supply and refinery numbers behind the balance.')],
    [candidate => candidate === 'analysis', () => some('How the evidence became the headline, confidence, and caveats.')],
    [() => true, () => some('The chart workbench for trend, distribution, variance, and baseline views.')],
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
  reportWeekIso: Maybe<string>,
) =>
  (routeId: AppRouteId): AppNavigationItemViewModel => ({
    routeId,
    label: routeLabel(routeId),
    href: appendReportWeekToHref(reportWeekIso)(routeHref(routeId)),
    isActive: activeRoute(activeRouteId)(routeId),
    description: routeDescription(routeId),
  })

const appRouteIds: readonly AppRouteId[] = ['home', 'inventory', 'price', 'balance', 'analysis', 'charts']

export const createAppNavigationViewModel = (
  activeRouteId: AppRouteId,
): AppNavigationViewModel => ({
  items: appRouteIds.map(navigationItem(activeRouteId, none())),
})

export const createAppNavigationViewModelWithReportWeek = (
  activeRouteId: AppRouteId,
  reportWeekIso: Maybe<string>,
): AppNavigationViewModel => ({
  items: appRouteIds.map(navigationItem(activeRouteId, reportWeekIso)),
})

export const createAnalysisControlViewModel = (summary: SummaryViewModel): AnalysisControlViewModel => ({
  reportWeekLabel: summary.reportWeekText,
  geographyLabel: summary.geographyText,
  comparisonWindowLabel: 'Latest weekly comparison window',
  submitLabel: 'Refresh live data',
  helperText: some('Refreshes the configured EIA run and rebuilds the briefing from the live sample window.'),
  fieldsDisabled: true,
})

export const createCaveatPanelViewModel = (summary: SummaryViewModel): CaveatPanelViewModel => ({
  title: 'What to keep in mind',
  caveats: summary.caveats,
  state: caveatPanelState(summary),
  summary: ifElse(
    (candidate: SummaryViewModel) => candidate.caveats.length > 0,
    candidate => some(`${String(candidate.caveats.length)} thing(s) qualify this week's read.`),
    () => some('No extra notes came through for this view. That supports a cleaner read, not a guarantee.'),
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
  traceStep('EIA rows loaded', 'The app requested the configured weekly petroleum sample window.', state),
  traceStep('Boundary rows translated', 'Raw API rows were validated before entering the domain model.', state),
  traceStep('Weekly facts assembled', 'Inventory, WTI price, refinery, and supply readings became comparable petroleum facts.', state),
  traceStep('Physical balance prepared', 'Supply, refinery demand, imports, exports, production, and stock movement were summarized.', state),
  traceStep('Signals contextualized', 'Trend, baseline, variance, anomaly, and caveats were computed before presentation.', state),
  traceStep('Analyst read composed', 'The headline, summary, confidence, and condition came from the analysis workflow.', state),
  traceStep('Display model prepared', 'The page received labels, states, chart payloads, and caveats ready for presentation.', 'Complete'),
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

const unavailableTimeSeries = (id: string, title: string): TimeSeriesChartViewModel => ({
  id,
  title,
  subtitle: some('Needs a wider weekly window.'),
  unitLabel: none(),
  points: [],
  currentPoint: none(),
  baseline: { kind: 'NotComputed', reason: 'history unavailable' },
  anomaly: { kind: 'NotComputed', reason: 'history unavailable' },
  caveats: [chartCaveat],
  accessibilitySummary: `${title} line chart is waiting on weekly points.`,
  displayState: 'Unavailable',
})

const unavailableMetricCard = (id: string, title: string): MetricCardViewModel => ({
  id,
  title,
  valueLabel: 'No value',
  unitLabel: none(),
  comparison: none(),
  trendLabel: none(),
  statusLabel: none(),
  caveats: [chartCaveat],
  sparkline: none(),
  accessibilitySummary: `${title} KPI card is waiting on a current value.`,
  displayState: 'Unavailable',
})

const unavailableBarChart = (id: string, title: string): BarChartViewModel => ({
  id,
  title,
  subtitle: some('Needs system balance drivers.'),
  unitLabel: none(),
  ordering: 'InputOrder',
  points: [],
  caveats: [chartCaveat],
  accessibilitySummary: `${title} bar chart is waiting on balance drivers.`,
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
  subtitle: some('Needs at least five weekly values.'),
  unitLabel: none(),
  summary: none(),
  outliers: [],
  currentMarker: none(),
  referenceMarkers: [],
  caveats: [chartCaveat],
  accessibilitySummary: `${title} box plot is waiting on at least five weekly values.`,
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
  subtitle: some('Needs a computed baseline reference.'),
  unitLabel: none(),
  referenceSemantics: 'Baseline comparison',
  entries: [],
  caveats: [chartCaveat],
  accessibilitySummary: `${title} variance chart is waiting on a computed baseline reference.`,
  displayState: 'Unavailable',
})

const chartPanel = (
  id: string,
  chartKind: ChartPanelKind,
  chartViewModel: ChartPanelViewModel['chartViewModel'],
): ChartPanelViewModel => ({
  id,
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
    [candidate => candidate === 'Partial', () => 'Useful, with caveats worth a look.'],
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

const defaultChartGalleryControls: ChartGalleryControlsViewModel = {
  histogramBinCount: 6,
  lineXAxisTickCount: 3,
  areaXAxisTickCount: 3,
}

const readableReportWeek = (reportWeekText: string): string =>
  ifElse(
    (result: Result<DateValue, DateParseError>) => isSuccess(result),
    result => formatDateReadable(result.value),
    () => reportWeekText,
  )(parseDate(reportWeekText))

const chartGalleryTitle = (summary: SummaryViewModel): string =>
  `Petroleum charts for ${readableReportWeek(summary.reportWeekText)}`

type LiveChartsGalleryInput = Readonly<{
  readonly summary: SummaryViewModel
  readonly signals: ContextualizedSignalSet
  readonly systemBalance: Maybe<SystemBalanceAnalysis>
  readonly inventoryHistory: readonly HistoricalSignalPointInput[]
  readonly priceHistory: readonly HistoricalSignalPointInput[]
}>

const numericValueAt =
  (fallback: number) =>
  (values: readonly number[], index: number): number =>
    ifElse(
      (candidate: number | undefined): candidate is number => typeof candidate === 'number',
      candidate => candidate,
      () => fallback,
    )(values[index])

const medianOfSortedValues = (values: readonly [number, ...number[]]): number => {
  const fallback = firstArrayItem(values)
  const valueAt = numericValueAt(fallback)
  const middleIndex = Math.floor(values.length / 2)

  return ifElse(
    (length: number) => length % 2 === 0,
    () => (valueAt(values, middleIndex - 1) + valueAt(values, middleIndex)) / 2,
    () => valueAt(values, middleIndex),
  )(values.length)
}

const lowerQuartileValues = (values: readonly [number, ...number[]]): readonly number[] =>
  values.slice(0, Math.floor(values.length / 2))

const upperQuartileValues = (values: readonly [number, ...number[]]): readonly number[] =>
  ifElse(
    (length: number) => length % 2 === 0,
    () => values.slice(Math.floor(values.length / 2)),
    () => values.slice(Math.floor(values.length / 2) + 1),
  )(values.length)

const medianFromValues = (values: readonly number[], fallback: number): number =>
  ifElse(
    isNonEmptyArray<number>,
    medianOfSortedValues,
    () => fallback,
  )(values)

const summaryFromSortedValues = (values: readonly [number, ...number[]]): FiveNumberSummaryViewModel => {
  const fallback = firstArrayItem(values)
  const median = medianOfSortedValues(values)

  return {
    minimum: Math.min(...values),
    firstQuartile: medianFromValues(lowerQuartileValues(values), fallback),
    median,
    thirdQuartile: medianFromValues(upperQuartileValues(values), fallback),
    maximum: Math.max(...values),
  }
}

const hasEnoughBoxPlotValues = (values: readonly number[]): boolean => values.length >= 5

const summaryFromEnoughValues = (values: readonly number[]): Maybe<FiveNumberSummaryViewModel> =>
  ifElse(
    isNonEmptyArray<number>,
    sorted => some(summaryFromSortedValues(sorted)),
    () => none(),
  )(values)

const boxPlotSummaryFromHistory = (
  historicalPoints: readonly HistoricalSignalPointInput[],
): Maybe<FiveNumberSummaryViewModel> => {
  const sortedValues = historicalPoints.map(point => point.value).sort((left, right) => left - right)

  return ifElse(
    hasEnoughBoxPlotValues,
    summaryFromEnoughValues,
    () => none(),
  )(sortedValues)
}

const boxPlotOutliersFromHistory = (_historicalPoints: readonly HistoricalSignalPointInput[]): readonly BoxPlotMarkerViewModel[] => []

export const mapLiveAnalysisToChartsGalleryViewModel = (input: LiveChartsGalleryInput): ChartsGalleryViewModel => {
  const priceTimeSeries = mapContextualizedSignalToTimeSeriesChart({
    id: 'price-line-chart',
    title: 'WTI trend window',
    subtitle: some('Weekly WTI observations in the loaded sample window'),
    signal: input.signals.price,
    historicalPoints: input.priceHistory,
  })
  const priceSparkline = mapContextualizedSignalToSparkline({
    id: 'price-sparkline',
    label: 'WTI trend sparkline',
    signal: input.signals.price,
    historicalPoints: input.priceHistory,
  })
  const priceMetricCard = mapContextualizedSignalToStandaloneMetricCard({
    id: 'price-kpi-card',
    title: 'WTI spot price',
    signal: input.signals.price,
  })
  const balanceBarChart = matchMaybe<SystemBalanceAnalysis, BarChartViewModel>({
    Some: analysis => mapSystemBalanceAnalysisToDriverBarChart({
      id: 'balance-driver-bar-chart',
      title: 'Balance contributors',
      analysis,
    }),
    None: () => unavailableBarChart('balance-driver-bar-chart', 'Balance contributors'),
  })(input.systemBalance)
  const priceHistogram = mapContextualizedSignalToHistogram({
    id: 'price-histogram',
    title: 'WTI sample distribution',
    subtitle: some('Weekly WTI observations in the loaded sample window'),
    signal: input.signals.price,
    historicalPoints: input.priceHistory,
    binStrategy: { kind: 'Automatic', requestedBinCount: 6 },
  })
  const priceBoxPlot = mapContextualizedSignalToBoxPlot({
    id: 'price-box-plot',
    title: 'WTI spread and quartiles',
    subtitle: some('Weekly WTI distribution across the loaded sample window'),
    signal: input.signals.price,
    historicalPoints: input.priceHistory,
    summary: boxPlotSummaryFromHistory(input.priceHistory),
    outliers: boxPlotOutliersFromHistory(input.priceHistory),
  })
  const inventoryAreaChart = mapContextualizedSignalToAreaChart({
    id: 'inventory-area-chart',
    title: 'Commercial crude stock level',
    subtitle: some('Weekly inventory observations in the loaded sample window'),
    signal: input.signals.inventory,
    historicalPoints: input.inventoryHistory,
    baseline: none(),
  })
  const priceVarianceChart = mapContextualizedSignalToVarianceChart({
    id: 'price-variance-chart',
    title: 'WTI baseline variance',
    subtitle: some('Current WTI spot price versus the computed baseline'),
    signal: input.signals.price,
    referenceLabel: 'Baseline',
    referenceSemantics: 'Current value compared with computed baseline average',
  })
  const panels = [
    chartPanel('price-line-panel', 'TimeSeries', priceTimeSeries),
    chartPanel('price-sparkline-panel', 'Sparkline', priceSparkline),
    chartPanel('price-kpi-panel', 'MetricCard', priceMetricCard),
    chartPanel('balance-driver-panel', 'BarChart', balanceBarChart),
    chartPanel('price-histogram-panel', 'Histogram', priceHistogram),
    chartPanel('price-box-plot-panel', 'BoxPlot', priceBoxPlot),
    chartPanel('inventory-area-panel', 'AreaChart', inventoryAreaChart),
    chartPanel('price-variance-panel', 'VarianceChart', priceVarianceChart),
  ]

  return {
    title: chartGalleryTitle(input.summary),
    description: '',
    controls: defaultChartGalleryControls,
    stateSummary: chartGalleryStateSummary(panels),
    panels,
    caveats: [presentationHistoryCaveat],
    state: 'Partial',
  }
}

export const mapSummaryToChartsGalleryViewModel = (summary: SummaryViewModel): ChartsGalleryViewModel => {
  const panels = [
    chartPanel('price-line-panel', 'TimeSeries', unavailableTimeSeries('price-line-chart', 'WTI trend window')),
    chartPanel('price-sparkline-panel', 'Sparkline', unavailableSparkline('price-sparkline', 'WTI trend sparkline')),
    chartPanel('price-kpi-panel', 'MetricCard', unavailableMetricCard('price-kpi-card', 'WTI spot price')),
    chartPanel('balance-driver-panel', 'BarChart', unavailableBarChart('balance-driver-bar-chart', 'Balance contributors')),
    chartPanel('price-histogram-panel', 'Histogram', unavailableHistogram('price-histogram', 'WTI sample distribution')),
    chartPanel('price-box-plot-panel', 'BoxPlot', unavailableBoxPlot('price-box-plot', 'WTI spread and quartiles')),
    chartPanel('inventory-area-panel', 'AreaChart', unavailableAreaChart('inventory-area-chart', 'Commercial crude stock level')),
    chartPanel('price-variance-panel', 'VarianceChart', unavailableVarianceChart('price-variance-chart', 'WTI baseline variance')),
  ]

  return {
    title: chartGalleryTitle(summary),
    description: '',
    controls: defaultChartGalleryControls,
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

const dashboardHeadlineFromCondition = (summary: SummaryViewModel): string =>
  cond<[SummaryViewModel], string>([
    [candidate => candidate.conditionLabel === 'Tightening', () => 'Crude supply ran lean this week.'],
    [candidate => candidate.conditionLabel === 'Loosening', () => 'Supply outpaced demand again this week.'],
    [candidate => candidate.conditionLabel === 'Balanced', () => 'The crude balance came in roughly even.'],
    [candidate => candidate.conditionLabel === 'Mixed', () => "This week's read sent mixed signals."],
    [() => true, () => 'Not enough data to read the balance this week.'],
  ])(summary)

const homeHeroViewModel = (summary: SummaryViewModel): HomeHeroViewModel => ({
  reportWeekLabel: `Report week as of ${summary.reportWeekText}`,
  headline: dashboardHeadlineFromCondition(summary),
  conditionLabel: summary.conditionLabel,
  summary: summary.summary,
})

const homeReportWeekControlViewModel = (reportWeekIso: string): HomeReportWeekControlViewModel => ({
  inputLabel: 'Report date',
  value: reportWeekIso,
  submitLabel: 'Load report',
})

const summaryReportWeekIso = (summary: SummaryViewModel): string =>
  ifElse(
    (result: Result<DateValue, DateParseError>) => isSuccess(result),
    result => formatDateIsoDate(result.value),
    currentIsoDate,
  )(parseDate(summary.reportWeekText))

const homeReportWeekControlFromSummary = (summary: SummaryViewModel): HomeReportWeekControlViewModel =>
  homeReportWeekControlViewModel(summaryReportWeekIso(summary))

const isDashboardMetricCard = (card: SummaryCardViewModel): boolean =>
  card.kind !== 'system'

const dashboardMetricFromCard =
  (homeChartHistory: Maybe<HomeMetricChartHistoryInput>, reportWeekIso: Maybe<string>) =>
  (card: SummaryCardViewModel): DashboardMetricViewModel => ({
    id: card.kind,
    title: card.title,
    valueText: card.valueText,
    changeText: card.trendLabel,
    subtitleText: card.subtitleText,
    href: appendReportWeekToMaybeHref(reportWeekIso)(card.drilldownTarget),
    chart: homeMetricChartFromCard(homeChartHistory)(card),
  })

const dashboardMetricsFromSummary = (
  summary: SummaryViewModel,
  homeChartHistory: Maybe<HomeMetricChartHistoryInput>,
  reportWeekIso: Maybe<string>,
): readonly DashboardMetricViewModel[] =>
  summary.cards.filter(isDashboardMetricCard).map(dashboardMetricFromCard(homeChartHistory, reportWeekIso))

const maybeCardByKind =
  (cards: readonly SummaryCardViewModel[]) =>
  (kind: SummaryCardKind): Maybe<SummaryCardViewModel> =>
    ifElse(
      (candidate: SummaryCardViewModel | undefined): candidate is SummaryCardViewModel => candidate !== undefined,
      some,
      () => none(),
    )(cards.find(card => card.kind === kind))

const balanceSnapshotMetricKinds: readonly SummaryCardKind[] = ['availableSupply', 'refineryDemand']

const balanceSnapshotRows = (
  summary: SummaryViewModel,
  reportWeekIso: Maybe<string>,
): readonly DashboardMetricViewModel[] =>
  balanceSnapshotMetricKinds.flatMap(kind =>
    matchMaybe<SummaryCardViewModel, readonly DashboardMetricViewModel[]>({
      Some: card => [dashboardMetricFromCard(none(), reportWeekIso)(card)],
      None: () => [],
    })(maybeCardByKind(summary.cards)(kind)),
  )

const balanceSnapshotResultLabel = (summary: SummaryViewModel): string =>
  matchMaybe<SummaryCardViewModel, string>({
    Some: card => card.valueText,
    None: () => 'Balance snapshot is waiting on supply and refinery data.',
  })(maybeCardByKind(summary.cards)('system'))

const balanceSnapshotViewModel = (summary: SummaryViewModel, reportWeekIso: Maybe<string>): BalanceSnapshotViewModel => ({
  title: 'Weekly balance snapshot',
  rows: balanceSnapshotRows(summary, reportWeekIso),
  resultLabel: balanceSnapshotResultLabel(summary),
  href: appendReportWeekToHref(reportWeekIso)('/balance'),
  linkLabel: 'See full balance',
})

const homeNavigationCards: readonly HomeNavigationCardViewModel[] = [
  {
    title: 'Crude Stocks',
    body: 'Where the storage numbers live: how much crude is in U.S. tanks and how that changed.',
    href: '/inventory',
    linkLabel: 'View inventory',
  },
  {
    title: 'WTI Price',
    body: 'How WTI moved this week and what it might be saying about the market.',
    href: '/price',
    linkLabel: 'View price',
  },
  {
    title: 'Weekly Balance',
    body: 'The supply and demand equation: four components, one result.',
    href: '/balance',
    linkLabel: 'View balance',
  },
  {
    title: 'Weekly Analysis',
    body: "Everything in one place: signals, drivers, and an honest read on what the data can and can't say.",
    href: '/analysis',
    linkLabel: 'View analysis',
  },
]

const homeFooterNotes: readonly string[] = [
  'See the Balance page for methodology notes.',
]

const homeNavigationCardWithReportWeek =
  (reportWeekIso: Maybe<string>) =>
  (card: HomeNavigationCardViewModel): HomeNavigationCardViewModel => ({
    ...card,
    href: appendReportWeekToHref(reportWeekIso)(card.href),
  })

const homeNavigationCardsWithReportWeek = (reportWeekIso: Maybe<string>): readonly HomeNavigationCardViewModel[] =>
  homeNavigationCards.map(homeNavigationCardWithReportWeek(reportWeekIso))

const emptyContentSections: readonly DetailContentSectionViewModel[] = []

const emptyNavigationNudges: readonly HomeNavigationCardViewModel[] = []

const detailPage = (
  title: string,
  headline: Maybe<string>,
  intro: readonly string[],
  cards: readonly SummaryCardViewModel[],
  charts: readonly ChartPanelViewModel[],
  summary: SummaryViewModel,
  reportWeekIso: Maybe<string>,
  contentSections: readonly DetailContentSectionViewModel[] = emptyContentSections,
  navigationNudges: readonly HomeNavigationCardViewModel[] = emptyNavigationNudges,
): DetailPageViewModel => ({
  title,
  subtitle: some(`${summary.reportWeekText} · ${summary.geographyText}`),
  headline,
  intro,
  cards,
  rows: detailRowsFromCards(cards),
  charts,
  contentSections,
  navigationNudges: navigationNudges.map(homeNavigationCardWithReportWeek(reportWeekIso)),
  caveats: summary.caveats,
  state: presentationStateFromSummaryState(summary.displayState),
  accessibilitySummary: `${title} page for ${summary.reportWeekText}, ${summary.geographyText}.`,
})

const panelsByKind = (
  gallery: ChartsGalleryViewModel,
  kind: ChartPanelKind,
): readonly ChartPanelViewModel[] => gallery.panels.filter(panel => panel.chartKind === kind)

const inventoryIntro: readonly string[] = [
  'Crude inventory measures how much commercial crude oil sits in U.S. storage facilities right now.',
  "When inventories build, the market adds supply. When they draw down, supply leaves storage faster than it arrives.",
  'The U.S. Energy Information Administration publishes this number every week. This page shows the latest reading and how it fits into recent history.',
]

const inventoryContextSections: readonly DetailContentSectionViewModel[] = [
  {
    title: "What this number includes, and what it doesn't",
    body: [
      "These are U.S. commercial crude oil stocks. They reflect oil held in commercial storage, but they don't include the Strategic Petroleum Reserve.",
      'EIA publishes this data weekly as part of its Weekly Petroleum Status Report. Each figure is an estimate based on company submissions and may be revised later.',
      "What inventories mean for supply and demand depends on how they moved, and that's what the Balance page works through.",
    ],
    rows: [],
  },
]

const inventoryNavigationNudges: readonly HomeNavigationCardViewModel[] = []

const priceIntro: readonly string[] = [
  'WTI, or West Texas Intermediate, is the benchmark price for crude oil traded in U.S. markets.',
  'It works as one signal beside the balance: not an explanation for what happened, but a check on whether the market agrees with the supply and demand numbers.',
]

const priceContextSections: readonly DetailContentSectionViewModel[] = [
  {
    title: 'What moves WTI besides this data',
    body: [
      "WTI reflects crude oil delivered to Cushing, Oklahoma. It's widely cited, but it can diverge from other regional crude prices.",
      'Price can move for reasons outside this dataset: macro policy, geopolitical events, currency shifts, and futures positioning.',
    ],
    rows: [],
  },
]

const priceNavigationNudges: readonly HomeNavigationCardViewModel[] = [
  {
    title: 'Weekly Analysis',
    body: 'The full picture: balance, signals, and what it all adds up to.',
    href: '/analysis',
    linkLabel: 'View analysis',
  },
]

const balanceIntro: readonly string[] = [
  'Every week, the EIA publishes a snapshot of how much crude oil flowed through the U.S. system.',
  'This page turns domestic production, imports, exports, and refinery demand into a simplified balance equation.',
  "It's not a complete physical accounting. It points to whether supply outpaced demand, demand outpaced supply, or the two came in roughly even.",
]

const balanceContextSections: readonly DetailContentSectionViewModel[] = [
  {
    title: "What this balance doesn't include",
    body: [
      'This is a simplified U.S. crude balance. It leaves out the Strategic Petroleum Reserve, product inventories, Cushing hub stocks, global supply and demand, regional variation, refinery outages, and imports or exports by origin.',
      "The equation also compares weekly stock changes with daily flow rates. Those units do not match, so the result points toward a condition rather than a precise accounting identity.",
    ],
    rows: [],
  },
]

const balanceNavigationNudges: readonly HomeNavigationCardViewModel[] = []

const analysisIntro: readonly string[] = [
  'This page puts the week together: the condition, the signals that support it, what complicates it, and how much confidence to place in the result.',
]

const analysisContextSections: readonly DetailContentSectionViewModel[] = [
  {
    title: 'What this analysis uses',
    body: [
      'This analysis uses four EIA weekly series. The Balance page covers what the equation leaves out, and those limits apply here too.',
      'One extra limit: correlation is not causation. When inventories draw down and WTI rises in the same week, that counts as agreement, not proof that one caused the other.',
      "The analysis doesn't claim to know why prices moved.",
    ],
    rows: [],
  },
  {
    title: 'Where to start',
    body: [
      'Start with the Balance page if you want to see the equation. Start with Inventory or Price if you want to follow one signal in depth.',
    ],
    rows: [],
  },
]

const analysisNavigationNudges: readonly HomeNavigationCardViewModel[] = []

export const mapSummaryToInventoryDetailViewModel = (summary: SummaryViewModel): InventoryDetailViewModel => {
  const gallery = mapSummaryToChartsGalleryViewModel(summary)

  return mapSummaryWithChartsToInventoryDetailViewModel(summary, gallery)
}

export const mapSummaryWithChartsToInventoryDetailViewModel = (
  summary: SummaryViewModel,
  gallery: ChartsGalleryViewModel,
): InventoryDetailViewModel => {
  const inventoryCards = summary.cards.filter(card => card.kind === 'inventory')
  const reportWeekIso = some(summaryReportWeekIso(summary))

  return detailPage(
    'Crude Stocks',
    some('How much oil is in U.S. commercial storage, and what changed this week.'),
    inventoryIntro,
    inventoryCards,
    [
      ...panelsByKind(gallery, 'AreaChart'),
    ],
    summary,
    reportWeekIso,
    inventoryContextSections,
    inventoryNavigationNudges,
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
  const reportWeekIso = some(summaryReportWeekIso(summary))

  return detailPage(
    'WTI Spot Price',
    some('The U.S. crude benchmark and what it did this week.'),
    priceIntro,
    priceCards,
    [
      ...panelsByKind(gallery, 'TimeSeries'),
      ...panelsByKind(gallery, 'Sparkline'),
      ...panelsByKind(gallery, 'MetricCard'),
      ...panelsByKind(gallery, 'Histogram'),
      ...panelsByKind(gallery, 'BoxPlot'),
    ],
    summary,
    reportWeekIso,
    priceContextSections,
    priceNavigationNudges,
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
  const reportWeekIso = some(summaryReportWeekIso(summary))

  return detailPage(
    'Weekly Crude Balance',
    some('How supply and demand lined up for U.S. crude this week.'),
    balanceIntro,
    balanceCards,
    [
      ...panelsByKind(gallery, 'BarChart'),
      ...panelsByKind(gallery, 'VarianceChart'),
    ],
    summary,
    reportWeekIso,
    balanceContextSections,
    balanceNavigationNudges,
  )
}

export const mapSummaryToAnalysisDetailViewModel = (summary: SummaryViewModel): AnalysisDetailViewModel =>
  mapSummaryWithChartsToAnalysisDetailViewModel(summary, mapSummaryToChartsGalleryViewModel(summary))

export const mapSummaryWithChartsToAnalysisDetailViewModel = (
  summary: SummaryViewModel,
  gallery: ChartsGalleryViewModel,
): AnalysisDetailViewModel =>
  detailPage(
    'Weekly Analysis',
    some(`The full read for the week ending ${summary.reportWeekText}.`),
    analysisIntro,
    summary.cards,
    gallery.panels,
    summary,
    some(summaryReportWeekIso(summary)),
    analysisContextSections,
    analysisNavigationNudges,
  )

export const mapSummaryToHomePageViewModel = (summary: SummaryViewModel): HomePageViewModel => {
  const gallery = mapSummaryToChartsGalleryViewModel(summary)

  return mapSummaryWithChartsToHomePageViewModel(summary, gallery, none(), none())
}

export const mapSummaryWithChartsToHomePageViewModel = (
  summary: SummaryViewModel,
  gallery: ChartsGalleryViewModel,
  homeChartHistory: Maybe<HomeMetricChartHistoryInput>,
  reportWeekIso: Maybe<string>,
): HomePageViewModel => ({
  summary,
  hero: homeHeroViewModel(summary),
  reportWeekControl: matchMaybe<string, HomeReportWeekControlViewModel>({
    Some: homeReportWeekControlViewModel,
    None: () => homeReportWeekControlFromSummary(summary),
  })(reportWeekIso),
  metrics: dashboardMetricsFromSummary(summary, homeChartHistory, reportWeekIso),
  balanceSnapshot: balanceSnapshotViewModel(summary, reportWeekIso),
  navigationCards: homeNavigationCardsWithReportWeek(reportWeekIso),
  footerNotes: homeFooterNotes,
  navigation: createAppNavigationViewModelWithReportWeek('home', reportWeekIso),
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
