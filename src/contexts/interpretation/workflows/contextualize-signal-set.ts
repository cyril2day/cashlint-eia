import { combineResults, type Result } from '@/shared/result'
import type { ContextualizedSignalSet, CurrentSignalSet } from '../model/current-signal-set'
import { contextualizeSignal } from './contextualize-signal'
import { type PreviousObservationMap } from '../model/previous-observation-map'
import { type InterpretationPolicies } from '../policies'
import { type InterpretationError } from '../errors'

export const contextualizeWalkingSkeletonSignalSet = (
  signals: CurrentSignalSet,
  previousObservations: PreviousObservationMap,
  policies: InterpretationPolicies,
): Result<ContextualizedSignalSet, InterpretationError> => {
  return combineResults(
    contextualizeSignal(signals.inventory, previousObservations, policies),
    contextualizeSignal(signals.price, previousObservations, policies),
    (inventory, price) => ({
      inventory,
      price,
    }),
  )
}
