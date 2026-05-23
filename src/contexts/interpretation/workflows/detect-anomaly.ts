import { formatMeasurementUnit } from '@/contexts/measurement/model/measurement-unit'
import { allPass, cond, ifElse } from '@/shared/fp'
import { failure, success, type Result } from '@/shared/result'

import {
  createAnomalousAnomalyState,
  createNormalAnomalyState,
  createNotComputedAnomalyState,
  type InterpretationAnomalyState,
} from '../model/anomaly-state'
import type { Baseline } from '../model/baseline'
import type { Signal } from '../model/signal'
import { formatSignalIdentity } from '../model/signal-identity'
import type { InterpretationPolicies } from '../policies'
import {
  makeAnomalyThresholdInvalidError,
  makeBaselineDispersionUnavailableError,
  makeIncompatibleUnitsError,
  makeInsufficientHistoryError,
  makeSignalIdentityMismatchError,
  type InterpretationError,
} from '../errors'

const identityMatches = (signal: Signal, baseline: Baseline): boolean =>
  formatSignalIdentity(signal.identity) === formatSignalIdentity(baseline.identity)

const unitsMatch = (signal: Signal, baseline: Baseline): boolean =>
  formatMeasurementUnit(signal.unit) === formatMeasurementUnit(baseline.unit)

const validThreshold = (policies: InterpretationPolicies): boolean =>
  allPass([
    (value: InterpretationPolicies) => Number.isFinite(value.anomaly.zScoreThreshold),
    (value: InterpretationPolicies) => value.anomaly.zScoreThreshold > 0,
  ])(policies)

const validDispersion = (baseline: Baseline): boolean =>
  allPass([
    (value: Baseline) => Number.isFinite(value.dispersion),
    (value: Baseline) => value.dispersion > 0,
  ])(baseline)

const zeroDispersionResult = (
  signal: Signal,
  policies: InterpretationPolicies,
): Result<InterpretationAnomalyState, InterpretationError> =>
  ifElse(
    (value: InterpretationPolicies) => value.anomaly.zeroDispersionBehavior === 'ReturnNotComputed',
    () => success(createNotComputedAnomalyState('BaselineDispersionUnavailable')),
    () => failure(makeBaselineDispersionUnavailableError(signal.identity)),
  )(policies)

const anomalyFromScore = (
  score: number,
  policies: InterpretationPolicies,
): InterpretationAnomalyState =>
  cond<[number], InterpretationAnomalyState>([
    [
      value => Math.abs(value) <= policies.anomaly.zScoreThreshold,
      createNormalAnomalyState,
    ],
    [
      value => value > 0,
      value => createAnomalousAnomalyState('HighSide', value),
    ],
    [
      () => true,
      value => createAnomalousAnomalyState('LowSide', value),
    ],
  ])(score)

export const detectAnomaly = (
  signal: Signal,
  baseline: Baseline,
  policies: InterpretationPolicies,
): Result<InterpretationAnomalyState, InterpretationError> =>
  cond<[Baseline], Result<InterpretationAnomalyState, InterpretationError>>([
    [
      value => identityMatches(signal, value) === false,
      value => failure(makeSignalIdentityMismatchError(signal.identity, value.identity)),
    ],
    [
      value => unitsMatch(signal, value) === false,
      value => failure(makeIncompatibleUnitsError(signal.identity, formatMeasurementUnit(signal.unit), formatMeasurementUnit(value.unit))),
    ],
    [
      () => validThreshold(policies) === false,
      () => failure(makeAnomalyThresholdInvalidError(signal.identity, String(policies.anomaly.zScoreThreshold))),
    ],
    [
      value => value.observationCount < policies.anomaly.minimumBaselineObservations,
      value => failure(makeInsufficientHistoryError(signal.identity, policies.anomaly.minimumBaselineObservations, value.observationCount)),
    ],
    [
      value => validDispersion(value) === false,
      () => zeroDispersionResult(signal, policies),
    ],
    [
      () => true,
      value => success(anomalyFromScore((signal.value - value.average) / value.dispersion, policies)),
    ],
  ])(baseline)
