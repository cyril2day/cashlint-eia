import { bindResult, mapResult, type Result } from '@/shared/result'
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
  return bindResult(contextualizeSignal(signals.inventory, previousObservations, policies), (inventory) =>
    mapResult(contextualizeSignal(signals.price, previousObservations, policies), (price) => ({
      inventory,
      price,
    })),
  )
}
