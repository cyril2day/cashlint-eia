import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, isStringInput, hasBrand, brand } from '@/shared/domain'

const priceKindBrand = Symbol('PriceKind')

export type PriceKindLabel = 'WTISpot'

const priceKinds: readonly PriceKindLabel[] = ['WTISpot']

export type PriceKind = Readonly<{
  readonly kind: PriceKindLabel
  readonly [priceKindBrand]: true
}>

export type PriceKindParseError = Readonly<{ readonly kind: 'InvalidPriceKindInput'; readonly input: string }>

const hasPriceKindBrand = hasBrand(priceKindBrand)
const isPriceKindLabel = (input: unknown): input is PriceKindLabel =>
  ifElse(
    isStringInput,
    (s: string) => priceKinds.some(p => p === s),
    () => false,
  )(input)

const hasValidKind = (candidate: object): boolean => isPriceKindLabel(Reflect.get(candidate, 'kind'))

const createPriceKind = (kind: PriceKindLabel): PriceKind => ({
  kind,
  [priceKindBrand]: true,
  ...brand(priceKindBrand),
})

export const isPriceKind = (input: unknown): input is PriceKind =>
  ifElse(
    isObjectInput,
    allPass([hasPriceKindBrand, hasValidKind]),
    () => false,
  )(input)

const makeInvalidPriceKindError = (input: unknown): PriceKindParseError => ({
  kind: 'InvalidPriceKindInput',
  input: String(input),
})

const parsePriceKindFromString = (value: string): Result<PriceKind, PriceKindParseError> =>
  ifElse(
    isPriceKindLabel,
    (v: PriceKindLabel) => success(createPriceKind(v)),
    (v: unknown) => failure(makeInvalidPriceKindError(v)),
  )(value)

export const parsePriceKind = (
  input: unknown,
): Result<PriceKind, PriceKindParseError> =>
  ifElse(
    isPriceKind,
    (candidate: PriceKind) => success(candidate),
    (candidate: unknown) => parsePriceKindFromString(String(candidate)),
  )(input)

export const formatPriceKind = (k: PriceKind): string => k.kind
