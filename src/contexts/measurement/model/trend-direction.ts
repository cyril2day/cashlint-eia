import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, isStringInput, hasBrand, brand } from '@/shared/domain'
import { getKey } from '@/shared/object'

const trendDirectionBrand = Symbol('TrendDirection')

export type TrendDirectionLabel = 'Up' | 'Down' | 'Flat'

const trendDirections: readonly TrendDirectionLabel[] = ['Up', 'Down', 'Flat']

export type TrendDirection = Readonly<{
  readonly direction: TrendDirectionLabel
  readonly [trendDirectionBrand]: true
}>

export type TrendDirectionParseError = Readonly<{ readonly kind: 'InvalidTrendDirectionInput'; readonly input: string }>

const hasTrendDirectionBrand = hasBrand(trendDirectionBrand)
const isTrendDirectionLabel = (input: unknown): input is TrendDirectionLabel =>
  ifElse(
    isStringInput,
    (s: string) => trendDirections.some(p => p === s),
    () => false,
  )(input)

const hasValidDirection = (candidate: object): boolean => isTrendDirectionLabel(getKey('direction')(candidate))

const createTrendDirection = (direction: TrendDirectionLabel): TrendDirection => ({
  direction,
  [trendDirectionBrand]: true,
  ...brand(trendDirectionBrand),
})

export const isTrendDirection = (input: unknown): input is TrendDirection =>
  ifElse(
    isObjectInput,
    allPass([hasTrendDirectionBrand, hasValidDirection]),
    () => false,
  )(input)

const makeInvalidTrendDirectionError = (input: unknown): TrendDirectionParseError => ({
  kind: 'InvalidTrendDirectionInput',
  input: String(input),
})

const parseTrendDirectionFromString = (value: string): Result<TrendDirection, TrendDirectionParseError> =>
  ifElse(
    isTrendDirectionLabel,
    (v: TrendDirectionLabel) => success(createTrendDirection(v)),
    (v: unknown) => failure(makeInvalidTrendDirectionError(v)),
  )(value)

export const parseTrendDirection = (
  input: unknown,
): Result<TrendDirection, TrendDirectionParseError> =>
  ifElse(
    isTrendDirection,
    (candidate: TrendDirection) => success(candidate),
    (candidate: unknown) => parseTrendDirectionFromString(String(candidate)),
  )(input)

export const formatTrendDirection = (d: TrendDirection): string => d.direction
