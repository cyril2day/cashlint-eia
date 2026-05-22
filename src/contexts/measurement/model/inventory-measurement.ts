import { allPass, anyPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, hasBrand, brand } from '@/shared/domain'
import { getKey } from '@/shared/object'
import type { InventoryProduct } from './inventory-product'
import type { WeeklyFact } from './weekly-fact'
import { isInventoryProduct } from './inventory-product'

const inventoryMeasurementBrand = Symbol('InventoryMeasurement')

export type InventoryMeasurement = Readonly<{
  readonly product: InventoryProduct
  readonly fact: WeeklyFact
  readonly [inventoryMeasurementBrand]: true
}>

export type InventoryMeasurementParseError = Readonly<{
  readonly kind: 'InvalidInventoryMeasurementInput'
  readonly input: string
}>

const hasInventoryMeasurementBrand = hasBrand(inventoryMeasurementBrand)

const isInventoryProductValue = (input: unknown): input is InventoryProduct => isInventoryProduct(input)

const hasValidProduct = (candidate: object): boolean => isInventoryProductValue(getKey('product')(candidate))

const hasCompatibleFact = (candidate: object): boolean =>
  allPass([
    (c: object) => Boolean(getKey('fact')(c)),
    (c: object) =>
      anyPass([
        (f: unknown) => JSON.stringify(f).indexOf('CrudeStocks') !== -1,
        (f: unknown) => JSON.stringify(f).indexOf('Inventory') !== -1,
      ])(getKey('fact')(c)),
  ])(candidate)

const createInventoryMeasurement = (product: InventoryProduct, fact: WeeklyFact): InventoryMeasurement => ({
  product,
  fact,
  [inventoryMeasurementBrand]: true,
  ...brand(inventoryMeasurementBrand),
})

const makeInvalidInventoryMeasurementError = (input: unknown): InventoryMeasurementParseError => ({
  kind: 'InvalidInventoryMeasurementInput',
  input: String(input),
})

export const isInventoryMeasurement = (input: unknown): input is InventoryMeasurement =>
  ifElse(
    isObjectInput,
    allPass([hasInventoryMeasurementBrand, hasValidProduct, hasCompatibleFact]),
    () => false,
  )(input)

export const parseInventoryMeasurement = (
  input: unknown,
): Result<InventoryMeasurement, InventoryMeasurementParseError> =>
  ifElse(
    isInventoryMeasurement,
    (candidate: InventoryMeasurement): Result<InventoryMeasurement, InventoryMeasurementParseError> => success(candidate),
    () => failure(makeInvalidInventoryMeasurementError(input)),
  )(input)

export const formatInventoryMeasurement = (m: InventoryMeasurement): string => `${m.product.product} ${String(m.fact.value)}`

export { createInventoryMeasurement }

export default parseInventoryMeasurement
