import { allPass, both, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, hasBrand, brand } from '@/shared/domain'
import { getKey } from '@/shared/object'

import type { MeasurementKind } from './measurement-kind'
import { isMeasurementKind } from './measurement-kind'
import type { WeeklyFact } from './weekly-fact'
import { isWeeklyFact } from './weekly-fact'
import { isRefineryMeasurementKindLabel } from './measurement-kind-groups'
import { isMeasurementUnitCompatibleWithKind } from './measurement-unit-compatibility'

const refineryMeasurementBrand = Symbol('RefineryMeasurement')

export type RefineryMeasurement = Readonly<{
  readonly measurementKind: MeasurementKind
  readonly fact: WeeklyFact
  readonly [refineryMeasurementBrand]: true
}>

export type RefineryMeasurementParseError = Readonly<{
  readonly kind: 'InvalidRefineryMeasurementInput'
  readonly input: string
}>

const hasRefineryMeasurementBrand = hasBrand(refineryMeasurementBrand)

const hasValidMeasurementKind = (candidate: object): boolean => {
  const measurementKind = getKey('measurementKind')(candidate)

  return ifElse(
    isMeasurementKind,
    (value: MeasurementKind) => isRefineryMeasurementKindLabel(value.kind),
    () => false,
  )(measurementKind)
}

const factUnitCompatibleWithKind = (measurementKind: MeasurementKind) => (factCandidate: unknown): boolean =>
  ifElse(
    isWeeklyFact,
    (fact: WeeklyFact) => isMeasurementUnitCompatibleWithKind(measurementKind, fact.unit),
    () => false,
  )(factCandidate)

const hasCompatibleUnit = (candidate: object): boolean =>
  ifElse(
    isMeasurementKind,
    (measurementKind: MeasurementKind) => factUnitCompatibleWithKind(measurementKind)(getKey('fact')(candidate)),
    () => false,
  )(getKey('measurementKind')(candidate))

const hasCompatibleFact = (candidate: object): boolean =>
  allPass([
    (current: object) => isWeeklyFact(getKey('fact')(current)),
    (current: object) => hasValidMeasurementKind(current),
    (current: object) => getKey('slice')(getKey('slice')(getKey('fact')(current))) === 'Refinery',
    (current: object) =>
      String(getKey('kind')(getKey('measurementKind')(getKey('fact')(current)))) ===
      String(getKey('kind')(getKey('measurementKind')(current))),
    (current: object) => hasCompatibleUnit(current),
  ])(candidate)

const createRefineryMeasurement = (
  measurementKind: MeasurementKind,
  fact: WeeklyFact,
): RefineryMeasurement => ({
  measurementKind,
  fact,
  [refineryMeasurementBrand]: true,
  ...brand(refineryMeasurementBrand),
})

const makeInvalidRefineryMeasurementError = (input: unknown): RefineryMeasurementParseError => ({
  kind: 'InvalidRefineryMeasurementInput',
  input: String(input),
})

export const isRefineryMeasurement = (input: unknown): input is RefineryMeasurement =>
  ifElse(
    isObjectInput,
    both(hasRefineryMeasurementBrand, both(hasValidMeasurementKind, hasCompatibleFact)),
    () => false,
  )(input)

export const parseRefineryMeasurement = (
  input: unknown,
): Result<RefineryMeasurement, RefineryMeasurementParseError> =>
  ifElse(
    isRefineryMeasurement,
    (candidate: RefineryMeasurement): Result<RefineryMeasurement, RefineryMeasurementParseError> => success(candidate),
    () => failure(makeInvalidRefineryMeasurementError(input)),
  )(input)

export const formatRefineryMeasurement = (m: RefineryMeasurement): string =>
  `${String(m.measurementKind.kind)} ${String(m.fact.value)}`

export { createRefineryMeasurement }

export default parseRefineryMeasurement
