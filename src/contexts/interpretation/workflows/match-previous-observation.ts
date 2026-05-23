import { bindResult, failure, success, type Result } from '@/shared/result'
import { ifElse } from '@/shared/fp'
import type { HistoricalObservation } from '../model/historical-observation'
import type { Signal } from '../model/signal'
import { formatSignalIdentity } from '../model/signal-identity'
import { makeIncompatibleUnitsError, makeMissingPreviousObservationError, makeSignalIdentityMismatchError, type InterpretationError } from '../errors'

const hasDifferentIdentity = (signal: Signal) => (observation: HistoricalObservation): boolean =>
  formatSignalIdentity(observation.identity) !== formatSignalIdentity(signal.identity)

const hasDifferentUnit = (signal: Signal) => (observation: HistoricalObservation): boolean =>
  observation.unit.unit !== signal.unit.unit

const ensureMatchingIdentity = (
  signal: Signal,
  observation: HistoricalObservation,
): Result<HistoricalObservation, InterpretationError> =>
  ifElse(
    hasDifferentIdentity(signal),
    (candidate) => failure(makeSignalIdentityMismatchError(signal.identity, candidate.identity)),
    (candidate) => success(candidate),
  )(observation)

const ensureMatchingIdentityFor = (signal: Signal) => (observation: HistoricalObservation): Result<HistoricalObservation, InterpretationError> =>
  ensureMatchingIdentity(signal, observation)

const ensureMatchingUnit = (
  signal: Signal,
  observation: HistoricalObservation,
): Result<HistoricalObservation, InterpretationError> =>
  ifElse(
    hasDifferentUnit(signal),
    (candidate) => failure(makeIncompatibleUnitsError(signal.identity, signal.unit.unit, candidate.unit.unit)),
    (candidate) => success(candidate),
  )(observation)

const ensureMatchingUnitFor = (signal: Signal) => (observation: HistoricalObservation): Result<HistoricalObservation, InterpretationError> =>
  ensureMatchingUnit(signal, observation)

const validateMatchedObservation = (signal: Signal) => (observation: HistoricalObservation): Result<HistoricalObservation, InterpretationError> =>
  bindResult(ensureMatchingIdentityFor(signal)(observation), ensureMatchingUnitFor(signal))

export const matchPreviousObservation = (
  signal: Signal,
  previousObservation: HistoricalObservation | undefined,
): Result<HistoricalObservation, InterpretationError> =>
  ifElse(
    (candidate: HistoricalObservation | undefined) => candidate === undefined,
    () => failure(makeMissingPreviousObservationError(signal.identity)),
    validateMatchedObservation(signal),
  )(previousObservation)
