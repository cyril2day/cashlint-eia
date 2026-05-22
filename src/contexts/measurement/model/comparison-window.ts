import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, isStringInput, hasBrand, brand } from '@/shared/domain'
import { getKey } from '@/shared/object'

const comparisonWindowBrand = Symbol('ComparisonWindow')

export type ComparisonWindowLabel = 'OneWeek' | 'TwoWeek' | 'FourWeek'

const comparisonWindows: readonly ComparisonWindowLabel[] = ['OneWeek', 'TwoWeek', 'FourWeek']

export type ComparisonWindow = Readonly<{
  readonly window: ComparisonWindowLabel
  readonly [comparisonWindowBrand]: true
}>

export type ComparisonWindowParseError = Readonly<{ readonly kind: 'InvalidComparisonWindowInput'; readonly input: string }>

const hasComparisonWindowBrand = hasBrand(comparisonWindowBrand)
const isComparisonWindowLabel = (input: unknown): input is ComparisonWindowLabel =>
  ifElse(
    isStringInput,
    (s: string) => comparisonWindows.some(p => p === s),
    () => false,
  )(input)

const hasValidWindow = (candidate: object): boolean => isComparisonWindowLabel(getKey('window')(candidate))

const createComparisonWindow = (window: ComparisonWindowLabel): ComparisonWindow => ({
  window,
  [comparisonWindowBrand]: true,
  ...brand(comparisonWindowBrand),
})

export const isComparisonWindow = (input: unknown): input is ComparisonWindow =>
  ifElse(
    isObjectInput,
    allPass([hasComparisonWindowBrand, hasValidWindow]),
    () => false,
  )(input)

const makeInvalidComparisonWindowError = (input: unknown): ComparisonWindowParseError => ({
  kind: 'InvalidComparisonWindowInput',
  input: String(input),
})

const parseComparisonWindowFromString = (value: string): Result<ComparisonWindow, ComparisonWindowParseError> =>
  ifElse(
    isComparisonWindowLabel,
    (v: ComparisonWindowLabel) => success(createComparisonWindow(v)),
    (v: unknown) => failure(makeInvalidComparisonWindowError(v)),
  )(value)

export const parseComparisonWindow = (
  input: unknown,
): Result<ComparisonWindow, ComparisonWindowParseError> =>
  ifElse(
    isComparisonWindow,
    (candidate: ComparisonWindow) => success(candidate),
    (candidate: unknown) => parseComparisonWindowFromString(String(candidate)),
  )(input)

export const formatComparisonWindow = (w: ComparisonWindow): string => w.window
