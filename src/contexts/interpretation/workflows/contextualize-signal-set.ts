import { combineResults, type Result } from '@/shared/result'
import type { ContextualizedSignalSet, CurrentSignalSet } from '../model/current-signal-set'
import type { HistoricalSignalSet } from '../model/historical-signal-set'
import { contextualizeSignal } from './contextualize-signal'
import { contextualizeFullSignal } from './contextualize-full-signal'
import { type PreviousObservationMap } from '../model/previous-observation-map'
import { type InterpretationPolicies } from '../policies'
import { type InterpretationError } from '../errors'

export const contextualizeWalkingSkeletonSignalSet = (
  signals: CurrentSignalSet,
  previousObservations: PreviousObservationMap,
  policies: InterpretationPolicies,
): Result<ContextualizedSignalSet, InterpretationError> =>
  combineResults(
    contextualizeSignal(signals.inventory, previousObservations, policies),
    contextualizeSignal(signals.price, previousObservations, policies),
    (inventory, price) => ({
      inventory,
      price,
    }),
  )

export const contextualizeFullSignalSet = (
  signals: CurrentSignalSet,
  historicalSeries: HistoricalSignalSet,
  policies: InterpretationPolicies,
): Result<ContextualizedSignalSet, InterpretationError> =>
  combineResults(
    contextualizeFullSignal(signals.inventory, historicalSeries.inventory, policies),
    contextualizeFullSignal(signals.price, historicalSeries.price, policies),
    (inventory, price) => ({
      inventory,
      price,
    }),
  )
