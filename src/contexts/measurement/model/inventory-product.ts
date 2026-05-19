import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'

const inventoryProductBrand = Symbol('InventoryProduct')

export type InventoryProductLabel = 'CrudeOil'

const inventoryProducts: readonly InventoryProductLabel[] = ['CrudeOil']

export type InventoryProduct = Readonly<{
  readonly product: InventoryProductLabel
  readonly [inventoryProductBrand]: true
}>

export type InventoryProductParseError = Readonly<{ readonly kind: 'InvalidInventoryProductInput'; readonly input: string }>

const isObjectInput = (input: unknown): input is object => input instanceof Object
const isStringInput = (input: unknown): input is string => typeof input === 'string'

const hasInventoryProductBrand = (candidate: object): boolean => Reflect.get(candidate, inventoryProductBrand) === true
const isInventoryProductLabel = (input: unknown): input is InventoryProductLabel =>
  ifElse(
    isStringInput,
    (s: string) => inventoryProducts.some(p => p === s),
    () => false,
  )(input)

const hasValidProduct = (candidate: object): boolean => isInventoryProductLabel(Reflect.get(candidate, 'product'))

const createInventoryProduct = (product: InventoryProductLabel): InventoryProduct => ({
  product,
  [inventoryProductBrand]: true,
})

export const isInventoryProduct = (input: unknown): input is InventoryProduct =>
  ifElse(
    isObjectInput,
    allPass([hasInventoryProductBrand, hasValidProduct]),
    () => false,
  )(input)

const makeInvalidInventoryProductError = (input: unknown): InventoryProductParseError => ({
  kind: 'InvalidInventoryProductInput',
  input: String(input),
})

const parseInventoryProductFromString = (value: string): Result<InventoryProduct, InventoryProductParseError> =>
  ifElse(
    isInventoryProductLabel,
    (v: InventoryProductLabel) => success(createInventoryProduct(v)),
    (v: unknown) => failure(makeInvalidInventoryProductError(v)),
  )(value)

export const parseInventoryProduct = (
  input: unknown,
): Result<InventoryProduct, InventoryProductParseError> =>
  ifElse(
    isInventoryProduct,
    (candidate: InventoryProduct) => success(candidate),
    (candidate: unknown) => parseInventoryProductFromString(String(candidate)),
  )(input)

export const formatInventoryProduct = (product: InventoryProduct): string => product.product
