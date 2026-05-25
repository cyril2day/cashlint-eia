import { combineResults, failure, success, type Result } from '@/shared/result'
import { ifElse } from '@/shared/fp'
import type { WeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import { createInventorySignalIdentity, createPriceSignalIdentity } from '@/contexts/interpretation/model/signal-identity'
import { createInventorySignal, createPriceSignal, type Signal } from '@/contexts/interpretation/model/signal'
import { type CurrentSignalSet } from '@/contexts/interpretation/model/current-signal-set'
import { makeMissingRequiredSignalError, type InterpretationError } from '@/contexts/interpretation/errors'

const createInventorySignalFromFacts = (inventory: WeeklyPetroleumFacts['inventories'][number]): Signal =>
  createInventorySignal(
    createInventorySignalIdentity(inventory.fact.geography, inventory.fact.measurementKind, inventory.fact.slice, inventory.product),
    inventory.fact.reportWeek,
    inventory.fact.geography,
    inventory.fact.value,
    inventory.fact.unit,
    inventory.fact.slice,
  )

export const extractInventorySignal = (facts: WeeklyPetroleumFacts): Result<Signal, InterpretationError> =>
  ifElse(
    (candidate: WeeklyPetroleumFacts['inventories'][number] | undefined) => candidate === undefined,
    () => failure(makeMissingRequiredSignalError('inventory')),
    candidate => success(createInventorySignalFromFacts(candidate)),
  )(facts.inventories[0])

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
  return combineResults(extractInventorySignal(facts), extractPriceSignal(facts), (inventory, price) => ({
    inventory,
    price,
  }))
}
