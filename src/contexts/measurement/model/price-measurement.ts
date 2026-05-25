import { allPass, anyPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, hasBrand, brand } from '@/shared/domain'
import { getKey } from '@/shared/object'
import type { PriceKind } from '@/contexts/measurement/model/price-kind'
import type { WeeklyFact } from '@/contexts/measurement/model/weekly-fact'
import { isPriceKind } from '@/contexts/measurement/model/price-kind'

const priceMeasurementBrand = Symbol('PriceMeasurement')

export type PriceMeasurement = Readonly<{
  readonly kind: PriceKind
  readonly fact: WeeklyFact
  readonly [priceMeasurementBrand]: true
}>

export type PriceMeasurementParseError = Readonly<{
  readonly kind: 'InvalidPriceMeasurementInput'
  readonly input: string
}>

const hasPriceMeasurementBrand = hasBrand(priceMeasurementBrand)

const isPriceKindValue = (input: unknown): input is PriceKind =>
  ifElse(
    isObjectInput,
    isPriceKind,
    () => false,
  )(input)

const hasValidKind = (candidate: object): boolean => isPriceKindValue(getKey('kind')(candidate))

const hasCompatibleFact = (candidate: object): boolean =>
  allPass([
    (c: object) => Boolean(getKey('fact')(c)),
    (c: object) =>
      anyPass([
        (f: unknown) => JSON.stringify(f).indexOf('WTISpotPrice') !== -1,
        (f: unknown) => JSON.stringify(f).indexOf('Price') !== -1,
      ])(getKey('fact')(c)),
  ])(candidate)

const createPriceMeasurement = (kind: PriceKind, fact: WeeklyFact): PriceMeasurement => ({
  kind,
  fact,
  [priceMeasurementBrand]: true,
  ...brand(priceMeasurementBrand),
})

const makeInvalidPriceMeasurementError = (input: unknown): PriceMeasurementParseError => ({
  kind: 'InvalidPriceMeasurementInput',
  input: String(input),
})

export const isPriceMeasurement = (input: unknown): input is PriceMeasurement =>
  ifElse(
    isObjectInput,
    allPass([hasPriceMeasurementBrand, hasValidKind, hasCompatibleFact]),
    () => false,
  )(input)

export const parsePriceMeasurement = (
  input: unknown,
): Result<PriceMeasurement, PriceMeasurementParseError> =>
  ifElse(
    isPriceMeasurement,
    (candidate: PriceMeasurement): Result<PriceMeasurement, PriceMeasurementParseError> => success(candidate),
    () => failure(makeInvalidPriceMeasurementError(input)),
  )(input)

export const formatPriceMeasurement = (m: PriceMeasurement): string => `${String(m.kind.kind)} ${String(m.fact.value)}`

export { createPriceMeasurement }

export default parsePriceMeasurement
