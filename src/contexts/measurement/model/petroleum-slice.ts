import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, isStringInput, hasBrand, brand } from '@/shared/domain'

const petroleumSliceBrand = Symbol('PetroleumSlice')

export type PetroleumSliceLabel = 'Inventory' | 'Refinery' | 'Supply' | 'Price'

const petroleumSlices: readonly PetroleumSliceLabel[] = ['Inventory', 'Refinery', 'Supply', 'Price']

export type PetroleumSlice = Readonly<{
  readonly slice: PetroleumSliceLabel
  readonly [petroleumSliceBrand]: true
}>

export type PetroleumSliceParseError = Readonly<{
  readonly kind: 'InvalidPetroleumSliceInput'
  readonly input: string
}>

const hasPetroleumSliceBrand = hasBrand(petroleumSliceBrand)
const isPetroleumSliceLabel = (input: unknown): input is PetroleumSliceLabel =>
  ifElse(
    isStringInput,
    (s: string) => petroleumSlices.some(p => p === s),
    () => false,
  )(input)

const hasValidSlice = (candidate: object): boolean => isPetroleumSliceLabel(Reflect.get(candidate, 'slice'))

const createPetroleumSlice = (slice: PetroleumSliceLabel): PetroleumSlice => ({
  slice,
  [petroleumSliceBrand]: true,
  ...brand(petroleumSliceBrand),
})

export const isPetroleumSlice = (input: unknown): input is PetroleumSlice =>
  ifElse(
    isObjectInput,
    allPass([hasPetroleumSliceBrand, hasValidSlice]),
    () => false,
  )(input)

const makeInvalidPetroleumSliceError = (input: unknown): PetroleumSliceParseError => ({
  kind: 'InvalidPetroleumSliceInput',
  input: String(input),
})

const parsePetroleumSliceFromString = (value: string): Result<PetroleumSlice, PetroleumSliceParseError> =>
  ifElse(
    isPetroleumSliceLabel,
    (v: PetroleumSliceLabel) => success(createPetroleumSlice(v)),
    (v: unknown) => failure(makeInvalidPetroleumSliceError(v)),
  )(value)

export const parsePetroleumSlice = (
  input: unknown,
): Result<PetroleumSlice, PetroleumSliceParseError> =>
  ifElse(
    isPetroleumSlice,
    (candidate: PetroleumSlice) => success(candidate),
    (candidate: unknown) => parsePetroleumSliceFromString(String(candidate)),
  )(input)

export const formatPetroleumSlice = (slice: PetroleumSlice): string => slice.slice
