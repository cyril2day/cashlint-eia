import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'

const balanceStateBrand = Symbol('BalanceState')

export type BalanceStateLabel = 'Tightening' | 'Loosening' | 'Balanced' | 'Mixed' | 'Unknown'

const balanceStates: readonly BalanceStateLabel[] = ['Tightening', 'Loosening', 'Balanced', 'Mixed', 'Unknown']

export type BalanceState = Readonly<{
  readonly state: BalanceStateLabel
  readonly [balanceStateBrand]: true
}>

export type BalanceStateParseError = Readonly<{ readonly kind: 'InvalidBalanceStateInput'; readonly input: string }>

const isObjectInput = (input: unknown): input is object => input instanceof Object
const isStringInput = (input: unknown): input is string => typeof input === 'string'

const hasBalanceStateBrand = (candidate: object): boolean => Reflect.get(candidate, balanceStateBrand) === true
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
