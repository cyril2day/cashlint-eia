import { allPass, both, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, hasBrand, brand } from '@/shared/domain'
import { getKey } from '@/shared/object'

import type { MeasurementKind } from '@/contexts/measurement/model/measurement-kind'
import { isMeasurementKind } from '@/contexts/measurement/model/measurement-kind'
import type { WeeklyFact } from '@/contexts/measurement/model/weekly-fact'
import { isWeeklyFact } from '@/contexts/measurement/model/weekly-fact'
import { isSupplyMeasurementKindLabel } from '@/contexts/measurement/model/measurement-kind-groups'
import { isMeasurementUnitCompatibleWithKind } from '@/contexts/measurement/model/measurement-unit-compatibility'

const supplyMeasurementBrand = Symbol('SupplyMeasurement')

export type SupplyMeasurement = Readonly<{
  readonly measurementKind: MeasurementKind
  readonly fact: WeeklyFact
  readonly [supplyMeasurementBrand]: true
}>

export type SupplyMeasurementParseError = Readonly<{
  readonly kind: 'InvalidSupplyMeasurementInput'
  readonly input: string
}>

const hasSupplyMeasurementBrand = hasBrand(supplyMeasurementBrand)

const hasValidMeasurementKind = (candidate: object): boolean => {
  const measurementKind = getKey('measurementKind')(candidate)

  return ifElse(
    isMeasurementKind,
    (value: MeasurementKind) => isSupplyMeasurementKindLabel(value.kind),
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
    (current: object) => getKey('slice')(getKey('slice')(getKey('fact')(current))) === 'Supply',
    (current: object) =>
      String(getKey('kind')(getKey('measurementKind')(getKey('fact')(current)))) ===
      String(getKey('kind')(getKey('measurementKind')(current))),
    (current: object) => hasCompatibleUnit(current),
  ])(candidate)

const createSupplyMeasurement = (
  measurementKind: MeasurementKind,
  fact: WeeklyFact,
): SupplyMeasurement => ({
  measurementKind,
  fact,
  [supplyMeasurementBrand]: true,
  ...brand(supplyMeasurementBrand),
})

const makeInvalidSupplyMeasurementError = (input: unknown): SupplyMeasurementParseError => ({
  kind: 'InvalidSupplyMeasurementInput',
  input: String(input),
})

export const isSupplyMeasurement = (input: unknown): input is SupplyMeasurement =>
  ifElse(
    isObjectInput,
    both(hasSupplyMeasurementBrand, both(hasValidMeasurementKind, hasCompatibleFact)),
    () => false,
  )(input)

export const parseSupplyMeasurement = (
  input: unknown,
): Result<SupplyMeasurement, SupplyMeasurementParseError> =>
  ifElse(
    isSupplyMeasurement,
    (candidate: SupplyMeasurement): Result<SupplyMeasurement, SupplyMeasurementParseError> => success(candidate),
    () => failure(makeInvalidSupplyMeasurementError(input)),
  )(input)

export const formatSupplyMeasurement = (m: SupplyMeasurement): string =>
  `${String(m.measurementKind.kind)} ${String(m.fact.value)}`

export { createSupplyMeasurement }

export default parseSupplyMeasurement
