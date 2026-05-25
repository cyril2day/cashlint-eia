import type { ApplicationError } from '@/application/errors'
import type { WalkingSkeletonCommand } from '@/application/commands/walking-skeleton-command'
import type { WalkingSkeletonDependencies } from '@/application/dependencies/walking-skeleton-dependencies'
import { buildWalkingSkeletonFactSeries } from '@/application/workflows/walking-skeleton'
import { toMeasurementAppError } from '@/application/errors'
import { createFullAnalysisPolicies, createWalkingSkeletonAnalysisPolicies } from '@/contexts/analysis/policies'
import { composeFullWeeklyAnalysis, composeWeeklyAnalysis } from '@/contexts/analysis/workflows'
import { buildPreviousObservationMap, contextualizeFullSignalSet, contextualizeWalkingSkeletonSignalSet, extractCurrentSignalSet, createWalkingSkeletonInterpretationPolicies } from '@/contexts/interpretation'
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
import type { WeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import { composeSystemBalanceAnalysis, defaultSystemBalancePolicy, type SystemBalanceAnalysis } from '@/contexts/system-balance'
import type { ChartsGalleryViewModel } from '@/presentation/contracts/charts-gallery-view-model'
import type { SummaryViewModel } from '@/presentation/contracts/summary-view-model'
import { mapLiveAnalysisToChartsGalleryViewModel, mapWeeklyAnalysisToSummaryViewModel } from '@/presentation/mappers'
import type { HistoricalSignalPointInput } from '@/presentation/charts/mappers'
import { allPass, ifElse } from '@/shared/fp'
import { bindAsyncResult } from '@/shared/async-result'
import { bindResult, combineResults, failure, mapError, mapResult, sequenceResults, success, type Result } from '@/shared/result'
import { none, some, type Maybe } from '@/shared/maybe'

const liveInventoryFlatThreshold = 1
const livePriceFlatThreshold = 1

type LiveSummaryInput = Readonly<{
  readonly factSeries: readonly WeeklyPetroleumFacts[]
  readonly currentFacts: WeeklyPetroleumFacts
  readonly previousFacts: Maybe<WeeklyPetroleumFacts>
  readonly previousObservations: PreviousObservationMap
}>

export type LiveRichUiViewModel = Readonly<{
  readonly summary: SummaryViewModel
  readonly chartsGallery: ChartsGalleryViewModel
}>

type LiveChartHistory = Readonly<{
  readonly inventory: readonly HistoricalSignalPointInput[]
  readonly price: readonly HistoricalSignalPointInput[]
}>

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
      createWalkingSkeletonInterpretationPolicies(
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
        composeWeeklyAnalysis(facts, contextualizedSignals, createWalkingSkeletonAnalysisPolicies()),
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

const contextualizeWalkingSignalHistory =
  (input: LiveSummaryInput, policies: InterpretationPolicies) =>
  (signalHistory: LiveSignalHistory): Result<LiveContextualizedSignalHistory, ApplicationError> =>
    mapResult(
      mapError(
        contextualizeWalkingSkeletonSignalSet(signalHistory.currentSignals, input.previousObservations, policies),
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
      contextualizeWalkingSignalHistory(input, policies),
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

const buildRichChartsForSignals = (
  summary: SummaryViewModel,
  contextualizedSignals: ContextualizedSignalSet,
): ((systemBalance: Maybe<SystemBalanceAnalysis>, history: LiveChartHistory) => LiveRichUiViewModel) =>
  (systemBalance, history) => ({
    summary,
    chartsGallery: mapLiveAnalysisToChartsGalleryViewModel({
      summary,
      signals: contextualizedSignals,
      systemBalance,
      inventoryHistory: history.inventory,
      priceHistory: history.price,
    }),
  })

const combineRichUiParts = (
  input: LiveSummaryInput,
  signalHistory: LiveContextualizedSignalHistory,
) =>
  (summary: SummaryViewModel): Result<LiveRichUiViewModel, ApplicationError> =>
    mapResult(
      buildSystemBalanceMaybe(input),
      systemBalance =>
        buildRichChartsForSignals(
          summary,
          signalHistory.contextualizedSignals,
        )(systemBalance, signalHistory.history),
    )

const buildLiveRichUiForSignals = (
  input: LiveSummaryInput,
) =>
  (signalHistory: LiveContextualizedSignalHistory): Result<LiveRichUiViewModel, ApplicationError> => {
    const summaryResult = buildSummaryFromSignalHistory(input)(signalHistory)

    return bindResult(summaryResult, combineRichUiParts(input, signalHistory))
  }

const buildLiveRichUiResult = (
  input: LiveSummaryInput,
): Result<LiveRichUiViewModel, ApplicationError> => {
  const interpretationPoliciesResult = createLiveInterpretationPolicies()
  const contextualizedSignalHistoryResult = bindResult(
    interpretationPoliciesResult,
    interpretationPolicies => buildContextualizedSignalHistory(input)(interpretationPolicies),
  )

  return bindResult(
    contextualizedSignalHistoryResult,
    buildLiveRichUiForSignals(input),
  )
}

export const buildLiveSummaryViewModel = (
  dependencies: WalkingSkeletonDependencies,
) =>
  (command: WalkingSkeletonCommand) =>
    bindAsyncResult(
      buildWalkingSkeletonFactSeries(dependencies)(command),
      factSeries => Promise.resolve(bindResult(buildLiveSummaryInput(factSeries), buildLiveSummaryResult)),
    )

export const buildLiveRichUiViewModel = (
  dependencies: WalkingSkeletonDependencies,
) =>
  (command: WalkingSkeletonCommand) =>
    bindAsyncResult(
      buildWalkingSkeletonFactSeries(dependencies)(command),
      factSeries => Promise.resolve(bindResult(buildLiveSummaryInput(factSeries), buildLiveRichUiResult)),
    )
