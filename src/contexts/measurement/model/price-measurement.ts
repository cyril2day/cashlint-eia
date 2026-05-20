import { allPass, anyPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, hasBrand, brand } from '@/shared/domain'
import type { PriceKind } from './price-kind'
import type { WeeklyFact } from './weekly-fact'
import { isPriceKind } from './price-kind'

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

const hasValidKind = (candidate: object): boolean => isPriceKind(Reflect.get(candidate, 'kind'))

const hasCompatibleFact = (candidate: object): boolean =>
  allPass([
    (c: object) => Boolean(Reflect.get(c, 'fact')),
    (c: object) =>
      anyPass([
        (f: unknown) => JSON.stringify(f).indexOf('WTISpotPrice') !== -1,
        (f: unknown) => JSON.stringify(f).indexOf('Price') !== -1,
      ])(Reflect.get(c, 'fact')),
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

export const formatPriceMeasurement = (m: PriceMeasurement): string => `${String(Reflect.get(m.kind, 'kind'))} ${String(Reflect.get(m.fact, 'value'))}`

export { createPriceMeasurement }

export default parsePriceMeasurement
