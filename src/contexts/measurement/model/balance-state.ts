import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, isStringInput, hasBrand, brand } from '@/shared/domain'

const balanceStateBrand = Symbol('BalanceState')

export type BalanceStateLabel = 'Tightening' | 'Loosening' | 'Balanced' | 'Mixed' | 'Unknown'

const balanceStates: readonly BalanceStateLabel[] = ['Tightening', 'Loosening', 'Balanced', 'Mixed', 'Unknown']

export type BalanceState = Readonly<{
  readonly state: BalanceStateLabel
  readonly [balanceStateBrand]: true
}>

export type BalanceStateParseError = Readonly<{ readonly kind: 'InvalidBalanceStateInput'; readonly input: string }>

const hasBalanceStateBrand = hasBrand(balanceStateBrand)
const isBalanceStateLabel = (input: unknown): input is BalanceStateLabel =>
  ifElse(
    isStringInput,
    (s: string) => balanceStates.some(p => p === s),
    () => false,
  )(input)

const hasValidState = (candidate: object): boolean => isBalanceStateLabel(Reflect.get(candidate, 'state'))

const createBalanceState = (state: BalanceStateLabel): BalanceState => ({
  state,
  [balanceStateBrand]: true,
  ...brand(balanceStateBrand),
})

export const isBalanceState = (input: unknown): input is BalanceState =>
  ifElse(
    isObjectInput,
    allPass([hasBalanceStateBrand, hasValidState]),
    () => false,
  )(input)

const makeInvalidBalanceStateError = (input: unknown): BalanceStateParseError => ({
  kind: 'InvalidBalanceStateInput',
  input: String(input),
})

const parseBalanceStateFromString = (value: string): Result<BalanceState, BalanceStateParseError> =>
  ifElse(
    isBalanceStateLabel,
    (v: BalanceStateLabel) => success(createBalanceState(v)),
    (v: unknown) => failure(makeInvalidBalanceStateError(v)),
  )(value)

export const parseBalanceState = (
  input: unknown,
): Result<BalanceState, BalanceStateParseError> =>
  ifElse(
    isBalanceState,
    (candidate: BalanceState) => success(candidate),
    (candidate: unknown) => parseBalanceStateFromString(String(candidate)),
  )(input)

export const formatBalanceState = (b: BalanceState): string => b.state
