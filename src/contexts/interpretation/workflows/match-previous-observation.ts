import { bindResult, failure, success, type Result } from '@/shared/result'
import { ifElse } from '@/shared/fp'
import type { HistoricalObservation } from '../model/historical-observation'
import type { Signal } from '../model/signal'
import { formatSignalIdentity } from '../model/signal-identity'
import { makeIncompatibleUnitsError, makeMissingPreviousObservationError, makeSignalIdentityMismatchError, type InterpretationError } from '../errors'

const ensureMatchingIdentity = (
  signal: Signal,
  observation: HistoricalObservation,
): Result<HistoricalObservation, InterpretationError> =>
  ifElse(
    (candidate: HistoricalObservation) => formatSignalIdentity(candidate.identity) !== formatSignalIdentity(signal.identity),
    (candidate) => failure(makeSignalIdentityMismatchError(signal.identity, candidate.identity)),
    (candidate) => success(candidate),
  )(observation)

const ensureMatchingUnit = (
  signal: Signal,
  observation: HistoricalObservation,
): Result<HistoricalObservation, InterpretationError> =>
  ifElse(
    (candidate: HistoricalObservation) => candidate.unit.unit !== signal.unit.unit,
    (candidate) => failure(makeIncompatibleUnitsError(signal.identity, signal.unit.unit, candidate.unit.unit)),
    (candidate) => success(candidate),
  )(observation)

export const matchPreviousObservation = (
  signal: Signal,
  previousObservation: HistoricalObservation | undefined,
): Result<HistoricalObservation, InterpretationError> =>
  ifElse(
    (candidate: HistoricalObservation | undefined) => candidate === undefined,
    () => failure(makeMissingPreviousObservationError(signal.identity)),
    (candidate) => bindResult(ensureMatchingIdentity(signal, candidate), (matched) => ensureMatchingUnit(signal, matched)),
  )(previousObservation)
