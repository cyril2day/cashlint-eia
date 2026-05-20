import { allPass, anyPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, hasBrand, brand } from '@/shared/domain'
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

const hasValidProduct = (candidate: object): boolean => isInventoryProduct(Reflect.get(candidate, 'product'))

const hasCompatibleFact = (candidate: object): boolean =>
  allPass([
    (c: object) => Boolean(Reflect.get(c, 'fact')),
    (c: object) =>
      anyPass([
        (f: unknown) => JSON.stringify(f).indexOf('CrudeStocks') !== -1,
        (f: unknown) => JSON.stringify(f).indexOf('Inventory') !== -1,
      ])(Reflect.get(c, 'fact')),
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

export const formatInventoryMeasurement = (m: InventoryMeasurement): string => `${Reflect.get(m.product, 'product')} ${String(Reflect.get(m.fact, 'value'))}`

export { createInventoryMeasurement }

export default parseInventoryMeasurement
