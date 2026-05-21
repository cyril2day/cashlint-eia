import { bindResult, failure, mapResult, success, type Result } from '@/shared/result'
import { ifElse } from '@/shared/fp'
import type { WeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import { createInventorySignalIdentity, createPriceSignalIdentity } from '../model/signal-identity'
import { createInventorySignal, createPriceSignal, type Signal } from '../model/signal'
import { type CurrentSignalSet } from '../model/current-signal-set'
import { makeMissingRequiredSignalError, type InterpretationError } from '../errors'

export const extractInventorySignal = (facts: WeeklyPetroleumFacts): Result<Signal, InterpretationError> => {
  const inventory = facts.inventories[0]

  return ifElse(
    (candidate: typeof inventory) => candidate === undefined,
    () => failure(makeMissingRequiredSignalError('inventory')),
    (candidate) =>
      success(
        createInventorySignal(
          createInventorySignalIdentity(candidate.fact.geography, candidate.fact.measurementKind, candidate.fact.slice, candidate.product),
          candidate.fact.reportWeek,
          candidate.fact.geography,
          candidate.fact.value,
          candidate.fact.unit,
          candidate.fact.slice,
        ),
      ),
  )(inventory)
}

export const extractPriceSignal = (facts: WeeklyPetroleumFacts): Result<Signal, InterpretationError> =>
  success(
    createPriceSignal(
      createPriceSignalIdentity(facts.price.fact.geography, facts.price.fact.measurementKind, facts.price.fact.slice, facts.price.kind),
      facts.price.fact.reportWeek,
      facts.price.fact.geography,
      facts.price.fact.value,
      facts.price.fact.unit,
      facts.price.fact.slice,
    ),
  )

export const extractCurrentSignalSet = (facts: WeeklyPetroleumFacts): Result<CurrentSignalSet, InterpretationError> => {
  return bindResult(extractInventorySignal(facts), (inventory) =>
    mapResult(extractPriceSignal(facts), (price) => ({
      inventory,
      price,
    })),
  )
}
