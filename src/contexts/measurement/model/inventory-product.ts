import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, isStringInput, hasBrand, brand } from '@/shared/domain'
import { getKey } from '@/shared/object'

const inventoryProductBrand = Symbol('InventoryProduct')

export type InventoryProductLabel = 'CrudeOil'

const inventoryProducts: readonly InventoryProductLabel[] = ['CrudeOil']

export type InventoryProduct = Readonly<{
  readonly product: InventoryProductLabel
  readonly [inventoryProductBrand]: true
}>

export type InventoryProductParseError = Readonly<{ readonly kind: 'InvalidInventoryProductInput'; readonly input: string }>

const hasInventoryProductBrand = hasBrand(inventoryProductBrand)
const isInventoryProductLabel = (input: unknown): input is InventoryProductLabel =>
  ifElse(
    isStringInput,
    (s: string) => inventoryProducts.some(p => p === s),
    () => false,
  )(input)

const hasValidProduct = (candidate: object): boolean => isInventoryProductLabel(getKey('product')(candidate))

const createInventoryProduct = (product: InventoryProductLabel): InventoryProduct => ({
  product,
  [inventoryProductBrand]: true,
  ...brand(inventoryProductBrand),
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
