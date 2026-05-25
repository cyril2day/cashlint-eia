import { combineResults, type Result } from '@/shared/result'
import type { ContextualizedSignalSet, CurrentSignalSet } from '@/contexts/interpretation/model/current-signal-set'
import type { HistoricalSignalSet } from '@/contexts/interpretation/model/historical-signal-set'
import { contextualizeSignal } from '@/contexts/interpretation/workflows/contextualize-signal'
import { contextualizeFullSignal } from '@/contexts/interpretation/workflows/contextualize-full-signal'
import { type PreviousObservationMap } from '@/contexts/interpretation/model/previous-observation-map'
import { type InterpretationPolicies } from '@/contexts/interpretation/policies'
import { type InterpretationError } from '@/contexts/interpretation/errors'

export const contextualizeCoreWeeklySignalSet = (
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
