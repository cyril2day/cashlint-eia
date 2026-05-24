import type { ApplicationError } from '@/application/errors'
import type { WalkingSkeletonCommand } from '@/application/commands/walking-skeleton-command'
import type { WalkingSkeletonDependencies } from '@/application/dependencies/walking-skeleton-dependencies'
import { buildWalkingSkeletonFactSeries } from '@/application/workflows/walking-skeleton'
import { toMeasurementAppError } from '@/application/errors'
import { createWalkingSkeletonAnalysisPolicies } from '@/contexts/analysis/policies'
import { composeWeeklyAnalysis } from '@/contexts/analysis/workflows'
import { buildPreviousObservationMap, contextualizeWalkingSkeletonSignalSet, extractCurrentSignalSet, createWalkingSkeletonInterpretationPolicies } from '@/contexts/interpretation'
import type { ContextualizedSignalSet } from '@/contexts/interpretation/model/current-signal-set'
import type { CurrentSignalSet } from '@/contexts/interpretation/model/current-signal-set'
import { createHistoricalObservation } from '@/contexts/interpretation/model/historical-observation'
import type { PreviousObservationMap } from '@/contexts/interpretation/model/previous-observation-map'
import type { InterpretationPolicies } from '@/contexts/interpretation/policies'
import { parseComparisonWindow } from '@/contexts/measurement/model'
import type { WeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import type { SummaryViewModel } from '@/presentation/contracts/summary-view-model'
import { mapWeeklyAnalysisToSummaryViewModel } from '@/presentation/mappers'
import { ifElse } from '@/shared/fp'
import { bindAsyncResult } from '@/shared/async-result'
import { bindResult, failure, mapError, mapResult, success, type Result } from '@/shared/result'

const liveInventoryFlatThreshold = 1
const livePriceFlatThreshold = 1

type LiveSummaryInput = Readonly<{
  readonly currentFacts: WeeklyPetroleumFacts
  readonly previousObservations: PreviousObservationMap
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

const buildContextualizedSignals =
  (facts: WeeklyPetroleumFacts, previousObservations: PreviousObservationMap) =>
  (policies: InterpretationPolicies): Result<ContextualizedSignalSet, ApplicationError> => {
    const currentSignalsResult = mapError(extractCurrentSignalSet(facts), toMeasurementAppError)

    return bindResult(
      currentSignalsResult,
      currentSignals =>
        mapError(
          contextualizeWalkingSkeletonSignalSet(currentSignals, previousObservations, policies),
          toMeasurementAppError,
        ),
    )
  }

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
): Result<LiveSummaryInput, ApplicationError> =>
  bindResult(
    selectCurrentFacts(factSeries),
    currentFacts =>
      mapResult(
        buildPreviousObservationMapFromSeries(factSeries),
        previousObservations => ({ currentFacts, previousObservations }),
      ),
  )

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

const buildLiveSummaryResult = (
  input: LiveSummaryInput,
): Result<SummaryViewModel, ApplicationError> => {
  const interpretationPoliciesResult = createLiveInterpretationPolicies()
  const contextualizedSignalsResult = bindResult(
    interpretationPoliciesResult,
    interpretationPolicies => buildContextualizedSignals(input.currentFacts, input.previousObservations)(interpretationPolicies),
  )

  return bindResult(contextualizedSignalsResult, buildSummaryViewModel(input.currentFacts))
}

export const buildLiveSummaryViewModel = (
  dependencies: WalkingSkeletonDependencies,
) =>
  (command: WalkingSkeletonCommand) =>
    bindAsyncResult(
      buildWalkingSkeletonFactSeries(dependencies)(command),
      factSeries => Promise.resolve(bindResult(buildLiveSummaryInput(factSeries), buildLiveSummaryResult)),
    )
