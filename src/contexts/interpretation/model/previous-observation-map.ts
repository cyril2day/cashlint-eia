import { none, some, type Maybe } from '@/shared/maybe'
import { ifElse } from '@/shared/fp'
import { formatSignalIdentity, type SignalIdentity } from '@/contexts/interpretation/model/signal-identity'
import type { HistoricalObservation } from '@/contexts/interpretation/model/historical-observation'

export type PreviousObservationMap = Readonly<Record<string, HistoricalObservation>>

export const buildPreviousObservationMap = (
  observations: readonly HistoricalObservation[],
): PreviousObservationMap =>
  observations.reduce<PreviousObservationMap>((accumulator, observation) => ({
    ...accumulator,
    [formatSignalIdentity(observation.identity)]: observation,
  }), {})

export const lookupPreviousObservation = (
  previousObservations: PreviousObservationMap,
  identity: SignalIdentity,
): Maybe<HistoricalObservation> => {
  const found: HistoricalObservation | undefined = previousObservations[formatSignalIdentity(identity)]

  return ifElse(
    (candidate: HistoricalObservation | undefined) => candidate === undefined,
    () => none(),
    (candidate: HistoricalObservation) => some(candidate),
  )(found)
}
