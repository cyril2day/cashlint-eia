import type { ApplicationError } from '@/application/errors'
import type { LiveWeeklyCommand } from '@/application/commands/live-weekly-command'
import type { LiveWeeklyDependencies } from '@/application/dependencies/live-weekly-dependencies'
import { buildLiveWeeklyFactSeries } from '@/application/workflows/live-weekly'
import { toMeasurementAppError } from '@/application/errors'
import { createFullAnalysisPolicies, createCoreWeeklyAnalysisPolicies } from '@/contexts/analysis/policies'
import { composeFullWeeklyAnalysis, composeWeeklyAnalysis } from '@/contexts/analysis/workflows'
import { buildPreviousObservationMap, contextualizeFullSignalSet, contextualizeCoreWeeklySignalSet, extractCurrentSignalSet, createCoreWeeklyInterpretationPolicies } from '@/contexts/interpretation'
import type { ContextualizedSignalSet } from '@/contexts/interpretation/model/current-signal-set'
import type { CurrentSignalSet } from '@/contexts/interpretation/model/current-signal-set'
import { createHistoricalObservation } from '@/contexts/interpretation/model/historical-observation'
import { createHistoricalSeries } from '@/contexts/interpretation/model/historical-series'
import type { HistoricalSignalSet } from '@/contexts/interpretation/model/historical-signal-set'
import type { PreviousObservationMap } from '@/contexts/interpretation/model/previous-observation-map'
import type { Signal } from '@/contexts/interpretation/model/signal'
import type { InterpretationPolicies } from '@/contexts/interpretation/policies'
import { parseComparisonWindow } from '@/contexts/measurement/model'
import { formatReportWeekIso } from '@/contexts/measurement/model/report-week'
import type { RefinerySet } from '@/contexts/measurement/model/refinery-set'
import type { SupplySet } from '@/contexts/measurement/model/supply-set'
import type { WeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import { composeSystemBalanceAnalysis, defaultSystemBalancePolicy, type SystemBalanceAnalysis } from '@/contexts/system-balance'
import type { ChartsGalleryViewModel } from '@/presentation/contracts/charts-gallery-view-model'
import type { SummaryViewModel } from '@/presentation/contracts/summary-view-model'
import { mapLiveAnalysisToChartsGalleryViewModel, mapWeeklyAnalysisToSummaryViewModel } from '@/presentation/mappers'
import type { HistoricalSignalPointInput } from '@/presentation/charts/mappers'
import type { HomeMetricChartHistoryInput, HomeMetricCompositionPointInput } from '@/presentation/mappers/home-metric-chart-view-model'
import { allPass, ifElse } from '@/shared/fp'
import { bindAsyncResult } from '@/shared/async-result'
import { bindResult, combineResults, failure, mapError, mapResult, sequenceResults, success, type Result } from '@/shared/result'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'

const liveInventoryFlatThreshold = 1
const livePriceFlatThreshold = 1

type LiveSummaryInput = Readonly<{
  readonly factSeries: readonly WeeklyPetroleumFacts[]
  readonly currentFacts: WeeklyPetroleumFacts
  readonly previousFacts: Maybe<WeeklyPetroleumFacts>
  readonly previousObservations: PreviousObservationMap
}>

export type LiveAppViewModel = Readonly<{
  readonly summary: SummaryViewModel
  readonly chartsGallery: ChartsGalleryViewModel
  readonly homeMetricChartHistory: HomeMetricChartHistoryInput
}>

type LiveChartHistory = HomeMetricChartHistoryInput

type LiveSignalHistory = Readonly<{
  readonly currentSignals: CurrentSignalSet
  readonly history: LiveChartHistory
}>

type LiveContextualizedSignalHistory = Readonly<{
  readonly contextualizedSignals: ContextualizedSignalSet
  readonly history: LiveChartHistory
}>

const createLiveInterpretationPolicies = (): Result<InterpretationPolicies, ApplicationError> =>
  mapError(
    mapResult(parseComparisonWindow('OneWeek'), comparisonWindow =>
      createCoreWeeklyInterpretationPolicies(
        comparisonWindow,
        liveInventoryFlatThreshold,
        livePriceFlatThreshold,
      ),
    ),
    toMeasurementAppError,
  )

const toHistoricalObservations = (
  signals: CurrentSignalSet,
) => [
  createHistoricalObservation(
    signals.inventory.identity,
    signals.inventory.reportWeek,
    signals.inventory.value,
    signals.inventory.unit,
  ),
  createHistoricalObservation(
    signals.price.identity,
    signals.price.reportWeek,
    signals.price.value,
    signals.price.unit,
  ),
]

const buildPreviousObservations = (
  facts: WeeklyPetroleumFacts,
): Result<PreviousObservationMap, ApplicationError> =>
  mapResult(
    mapError(extractCurrentSignalSet(facts), toMeasurementAppError),
    signals => buildPreviousObservationMap(toHistoricalObservations(signals)),
  )

const selectCurrentFacts = (
  factSeries: readonly WeeklyPetroleumFacts[],
): Result<WeeklyPetroleumFacts, ApplicationError> => {
  const currentFacts = factSeries[0]

  return ifElse(
    (candidate: WeeklyPetroleumFacts | undefined): candidate is undefined => candidate === undefined,
    () => failure(toMeasurementAppError({ kind: 'NoWeeklyFacts', input: 'empty-fact-series' })),
    (candidate: WeeklyPetroleumFacts) => success(candidate),
  )(currentFacts)
}

const buildPreviousObservationMapFromSeries = (
  factSeries: readonly WeeklyPetroleumFacts[],
): Result<PreviousObservationMap, ApplicationError> => {
  const previousFacts = factSeries[1]

  return ifElse(
    (candidate: WeeklyPetroleumFacts | undefined): candidate is undefined => candidate === undefined,
    () => success(buildPreviousObservationMap([])),
    buildPreviousObservations,
  )(previousFacts)
}

const buildLiveSummaryInput = (
  factSeries: readonly WeeklyPetroleumFacts[],
): Result<LiveSummaryInput, ApplicationError> => {
  const previousFacts = ifElse(
    (candidate: WeeklyPetroleumFacts | undefined): candidate is WeeklyPetroleumFacts => candidate !== undefined,
    candidate => some(candidate),
    () => none(),
  )(factSeries[1])

  return bindResult(
    selectCurrentFacts(factSeries),
    currentFacts =>
      mapResult(
        buildPreviousObservationMapFromSeries(factSeries),
        previousObservations => ({ factSeries, currentFacts, previousFacts, previousObservations }),
      ),
  )
}

const buildSummaryViewModel =
  (facts: WeeklyPetroleumFacts) =>
  (contextualizedSignals: ContextualizedSignalSet): Result<SummaryViewModel, ApplicationError> =>
    mapResult(
      mapError(
        composeWeeklyAnalysis(facts, contextualizedSignals, createCoreWeeklyAnalysisPolicies()),
        toMeasurementAppError,
      ),
      mapWeeklyAnalysisToSummaryViewModel,
    )

const buildFullSummaryViewModel =
  (input: LiveSummaryInput) =>
  (contextualizedSignals: ContextualizedSignalSet): Result<SummaryViewModel, ApplicationError> => {
    const systemBalanceAnalysis = mapError(
      composeSystemBalanceAnalysis(some(input.currentFacts), input.previousFacts, defaultSystemBalancePolicy),
      toMeasurementAppError,
    )
    const weeklyAnalysis = bindResult(
      systemBalanceAnalysis,
      balanceAnalysis =>
        mapError(
          composeFullWeeklyAnalysis(balanceAnalysis, contextualizedSignals, createFullAnalysisPolicies()),
          toMeasurementAppError,
        ),
    )

    return mapResult(weeklyAnalysis, mapWeeklyAnalysisToSummaryViewModel)
  }

const buildSummaryFromSignalHistory =
  (input: LiveSummaryInput) =>
  (signalHistory: LiveContextualizedSignalHistory): Result<SummaryViewModel, ApplicationError> =>
    ifElse(
      (candidate: Maybe<WeeklyPetroleumFacts>) => candidate.kind === 'Some',
      () => buildFullSummaryViewModel(input)(signalHistory.contextualizedSignals),
      () => buildSummaryViewModel(input.currentFacts)(signalHistory.contextualizedSignals),
    )(input.previousFacts)

const buildLiveSummaryResult = (
  input: LiveSummaryInput,
): Result<SummaryViewModel, ApplicationError> => {
  const interpretationPoliciesResult = createLiveInterpretationPolicies()
  const contextualizedSignalHistoryResult = bindResult(
    interpretationPoliciesResult,
    interpretationPolicies => buildContextualizedSignalHistory(input)(interpretationPolicies),
  )

  return bindResult(
    contextualizedSignalHistoryResult,
    buildSummaryFromSignalHistory(input),
  )
}

const toInventoryHistoricalPoint = (signals: CurrentSignalSet): HistoricalSignalPointInput => ({
  reportWeek: signals.inventory.reportWeek,
  value: signals.inventory.value,
})

const toPriceHistoricalPoint = (signals: CurrentSignalSet): HistoricalSignalPointInput => ({
  reportWeek: signals.price.reportWeek,
  value: signals.price.value,
})

const maybeToArray = <Value>(value: Maybe<Value>): readonly Value[] =>
  matchMaybe<Value, readonly Value[]>({
    Some: item => [item],
    None: () => [],
  })(value)

const toAvailableSupplyHistoricalPoint = (facts: WeeklyPetroleumFacts): Maybe<HomeMetricCompositionPointInput> =>
  matchMaybe<SupplySet, Maybe<HomeMetricCompositionPointInput>>({
    Some: supply => some({
      reportWeek: supply.reportWeek,
      value: supply.production.fact.value,
      secondaryValue: supply.imports.fact.value - supply.exports.fact.value,
    }),
    None: () => none(),
  })(facts.supply)

const toRefineryDemandHistoricalPoint = (facts: WeeklyPetroleumFacts): Maybe<HistoricalSignalPointInput> =>
  matchMaybe<RefinerySet, Maybe<HistoricalSignalPointInput>>({
    Some: refinery => some({
      reportWeek: refinery.reportWeek,
      value: refinery.netInput.fact.value,
    }),
    None: () => none(),
  })(facts.refinery)

const extractCurrentSignalSetFromFacts = (
  facts: WeeklyPetroleumFacts,
): Result<CurrentSignalSet, ApplicationError> =>
  mapError(extractCurrentSignalSet(facts), toMeasurementAppError)

const buildLiveChartHistory = (
  factSeries: readonly WeeklyPetroleumFacts[],
): Result<LiveChartHistory, ApplicationError> =>
  mapResult(
    sequenceResults(factSeries.map(extractCurrentSignalSetFromFacts)),
    signals => ({
      inventory: signals.map(toInventoryHistoricalPoint),
      price: signals.map(toPriceHistoricalPoint),
      availableSupply: factSeries.flatMap(facts => maybeToArray(toAvailableSupplyHistoricalPoint(facts))),
      refineryDemand: factSeries.flatMap(facts => maybeToArray(toRefineryDemandHistoricalPoint(facts))),
    }),
  )

const isDifferentReportWeek =
  (signal: Signal) =>
  (point: HistoricalSignalPointInput): boolean =>
    formatReportWeekIso(point.reportWeek) !== formatReportWeekIso(signal.reportWeek)

const toHistoricalObservation =
  (signal: Signal) =>
  (point: HistoricalSignalPointInput) =>
    createHistoricalObservation(signal.identity, point.reportWeek, point.value, signal.unit)

const buildHistoricalSeriesForSignal = (
  signal: Signal,
  points: readonly HistoricalSignalPointInput[],
) =>
  createHistoricalSeries(
    signal.identity,
    signal.unit,
    points
      .filter(isDifferentReportWeek(signal))
      .map(toHistoricalObservation(signal)),
  )

const buildHistoricalSignalSet = (
  currentSignals: CurrentSignalSet,
  history: LiveChartHistory,
): HistoricalSignalSet => ({
  inventory: buildHistoricalSeriesForSignal(currentSignals.inventory, history.inventory),
  price: buildHistoricalSeriesForSignal(currentSignals.price, history.price),
})

const priorInventoryPointCount = (signalHistory: LiveSignalHistory): number =>
  signalHistory.history.inventory.filter(isDifferentReportWeek(signalHistory.currentSignals.inventory)).length

const priorPricePointCount = (signalHistory: LiveSignalHistory): number =>
  signalHistory.history.price.filter(isDifferentReportWeek(signalHistory.currentSignals.price)).length

const hasPriorInventoryHistory = (signalHistory: LiveSignalHistory): boolean =>
  priorInventoryPointCount(signalHistory) > 0

const hasPriorPriceHistory = (signalHistory: LiveSignalHistory): boolean =>
  priorPricePointCount(signalHistory) > 0

const hasPriorSignalHistory = allPass([
  hasPriorInventoryHistory,
  hasPriorPriceHistory,
])

const buildLiveSignalHistory = (
  input: LiveSummaryInput,
): Result<LiveSignalHistory, ApplicationError> =>
  combineResults(
    extractCurrentSignalSetFromFacts(input.currentFacts),
    buildLiveChartHistory(input.factSeries),
    (currentSignals, history) => ({ currentSignals, history }),
  )

const toLiveContextualizedSignalHistory =
  (history: LiveChartHistory) =>
  (contextualizedSignals: ContextualizedSignalSet): LiveContextualizedSignalHistory => ({
    contextualizedSignals,
    history,
  })

const contextualizeFullSignalHistory =
  (policies: InterpretationPolicies) =>
  (signalHistory: LiveSignalHistory): Result<LiveContextualizedSignalHistory, ApplicationError> =>
    mapResult(
      mapError(
        contextualizeFullSignalSet(
          signalHistory.currentSignals,
          buildHistoricalSignalSet(signalHistory.currentSignals, signalHistory.history),
          policies,
        ),
        toMeasurementAppError,
      ),
      toLiveContextualizedSignalHistory(signalHistory.history),
    )

const contextualizeCoreSignalHistory =
  (input: LiveSummaryInput, policies: InterpretationPolicies) =>
  (signalHistory: LiveSignalHistory): Result<LiveContextualizedSignalHistory, ApplicationError> =>
    mapResult(
      mapError(
        contextualizeCoreWeeklySignalSet(signalHistory.currentSignals, input.previousObservations, policies),
        toMeasurementAppError,
      ),
      toLiveContextualizedSignalHistory(signalHistory.history),
    )

const contextualizeSignalHistory =
  (input: LiveSummaryInput, policies: InterpretationPolicies) =>
  (signalHistory: LiveSignalHistory): Result<LiveContextualizedSignalHistory, ApplicationError> =>
    ifElse(
      hasPriorSignalHistory,
      contextualizeFullSignalHistory(policies),
      contextualizeCoreSignalHistory(input, policies),
    )(signalHistory)

const buildContextualizedSignalHistory =
  (input: LiveSummaryInput) =>
  (policies: InterpretationPolicies): Result<LiveContextualizedSignalHistory, ApplicationError> =>
    bindResult(
      buildLiveSignalHistory(input),
      contextualizeSignalHistory(input, policies),
    )

const hasPreviousFacts = (input: LiveSummaryInput): boolean => input.previousFacts.kind === 'Some'

const buildSystemBalanceMaybe = (
  input: LiveSummaryInput,
): Result<Maybe<SystemBalanceAnalysis>, ApplicationError> =>
  ifElse(
    hasPreviousFacts,
    candidate =>
      mapResult(
        mapError(
          composeSystemBalanceAnalysis(some(candidate.currentFacts), candidate.previousFacts, defaultSystemBalancePolicy),
          toMeasurementAppError,
        ),
        some,
      ),
    () => success(none()),
  )(input)

const buildChartsForSignals = (
  summary: SummaryViewModel,
  contextualizedSignals: ContextualizedSignalSet,
): ((systemBalance: Maybe<SystemBalanceAnalysis>, history: LiveChartHistory) => LiveAppViewModel) =>
  (systemBalance, history) => ({
    summary,
    homeMetricChartHistory: history,
    chartsGallery: mapLiveAnalysisToChartsGalleryViewModel({
      summary,
      signals: contextualizedSignals,
      systemBalance,
      inventoryHistory: history.inventory,
      priceHistory: history.price,
    }),
  })

const combineAppParts = (
  input: LiveSummaryInput,
  signalHistory: LiveContextualizedSignalHistory,
) =>
  (summary: SummaryViewModel): Result<LiveAppViewModel, ApplicationError> =>
    mapResult(
      buildSystemBalanceMaybe(input),
      systemBalance =>
        buildChartsForSignals(
          summary,
          signalHistory.contextualizedSignals,
        )(systemBalance, signalHistory.history),
    )

const buildLiveAppForSignals = (
  input: LiveSummaryInput,
) =>
  (signalHistory: LiveContextualizedSignalHistory): Result<LiveAppViewModel, ApplicationError> => {
    const summaryResult = buildSummaryFromSignalHistory(input)(signalHistory)

    return bindResult(summaryResult, combineAppParts(input, signalHistory))
  }

const buildLiveAppResult = (
  input: LiveSummaryInput,
): Result<LiveAppViewModel, ApplicationError> => {
  const interpretationPoliciesResult = createLiveInterpretationPolicies()
  const contextualizedSignalHistoryResult = bindResult(
    interpretationPoliciesResult,
    interpretationPolicies => buildContextualizedSignalHistory(input)(interpretationPolicies),
  )

  return bindResult(
    contextualizedSignalHistoryResult,
    buildLiveAppForSignals(input),
  )
}

export const buildLiveSummaryViewModel = (
  dependencies: LiveWeeklyDependencies,
) =>
  (command: LiveWeeklyCommand) =>
    bindAsyncResult(
      buildLiveWeeklyFactSeries(dependencies)(command),
      factSeries => Promise.resolve(bindResult(buildLiveSummaryInput(factSeries), buildLiveSummaryResult)),
    )

export const buildLiveAppViewModel = (
  dependencies: LiveWeeklyDependencies,
) =>
  (command: LiveWeeklyCommand) =>
    bindAsyncResult(
      buildLiveWeeklyFactSeries(dependencies)(command),
      factSeries => Promise.resolve(bindResult(buildLiveSummaryInput(factSeries), buildLiveAppResult)),
    )
