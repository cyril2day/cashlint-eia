import type { ApplicationError } from '@/application/errors'
import type { WalkingSkeletonCommand } from '@/application/commands/walking-skeleton-command'
import type { WalkingSkeletonDependencies } from '@/application/dependencies/walking-skeleton-dependencies'
import { buildWalkingSkeleton } from '@/application/workflows/walking-skeleton'
import { toMeasurementAppError } from '@/application/errors'
import { createWalkingSkeletonAnalysisPolicies } from '@/contexts/analysis/policies'
import { composeWeeklyAnalysis } from '@/contexts/analysis/workflows'
import { buildPreviousObservationMap, contextualizeWalkingSkeletonSignalSet, extractCurrentSignalSet, createWalkingSkeletonInterpretationPolicies } from '@/contexts/interpretation'
import type { ContextualizedSignalSet } from '@/contexts/interpretation/model/current-signal-set'
import type { InterpretationPolicies } from '@/contexts/interpretation/policies'
import { parseComparisonWindow } from '@/contexts/measurement/model'
import type { WeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import type { SummaryViewModel } from '@/presentation/contracts/summary-view-model'
import { mapWeeklyAnalysisToSummaryViewModel } from '@/presentation/mappers'
import { bindAsyncResult } from '@/shared/async-result'
import { bindResult, mapError, mapResult, type Result } from '@/shared/result'

const liveInventoryFlatThreshold = 1
const livePriceFlatThreshold = 1

const livePreviousObservations = buildPreviousObservationMap([])

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
  (facts: WeeklyPetroleumFacts) =>
  (policies: InterpretationPolicies): Result<ContextualizedSignalSet, ApplicationError> => {
    const currentSignalsResult = mapError(extractCurrentSignalSet(facts), toMeasurementAppError)

    return bindResult(
      currentSignalsResult,
      currentSignals =>
        mapError(
          contextualizeWalkingSkeletonSignalSet(currentSignals, livePreviousObservations, policies),
          toMeasurementAppError,
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

const buildLiveSummaryResult = (
  facts: WeeklyPetroleumFacts,
): Result<SummaryViewModel, ApplicationError> => {
  const interpretationPoliciesResult = createLiveInterpretationPolicies()
  const contextualizedSignalsResult = bindResult(
    interpretationPoliciesResult,
    interpretationPolicies => buildContextualizedSignals(facts)(interpretationPolicies),
  )

  return bindResult(contextualizedSignalsResult, buildSummaryViewModel(facts))
}

export const buildLiveSummaryViewModel = (
  dependencies: WalkingSkeletonDependencies,
) =>
  (command: WalkingSkeletonCommand) =>
    bindAsyncResult(
      buildWalkingSkeleton(dependencies)(command),
      facts => Promise.resolve(buildLiveSummaryResult(facts)),
    )