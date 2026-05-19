import { cond, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'

export type Decimal = number

export type DecimalParseError = {
  readonly kind: 'InvalidDecimalInput'
  readonly input: string
}

const describeDecimalInput = (input: unknown): string =>
  String(input)

const isStringInput = (input: unknown): input is string => typeof input === 'string'

const isNumberInput = (input: unknown): input is number => typeof input === 'number'

const isNonEmptyStringInput = (input: string): boolean => input.trim().length > 0

const isFiniteStringInput = (input: string): boolean =>
  ifElse(
    isNonEmptyStringInput,
    (candidate: string) => Number.isFinite(Number(candidate)),
    () => false,
  )(input)

const isFiniteDecimalInput = (input: unknown): input is number | string =>
  cond([
    [(v: unknown) => isNumberInput(v), (v: unknown) => ifElse(isNumberInput, Number.isFinite, () => false)(v)],
    [(v: unknown) => isStringInput(v), (v: unknown) => ifElse(isStringInput, isFiniteStringInput, () => false)(v)],
    [() => true, () => false],
  ])(input)

const coerceDecimal = (input: number | string): Decimal =>
  ifElse(
    (candidate: number | string) => typeof candidate === 'number',
    (candidate: number) => candidate,
    (candidate: string) => Number(candidate),
  )(input)

export const isDecimal = (input: unknown): input is Decimal =>
  ifElse(
    isNumberInput,
    Number.isFinite,
    () => false,
  )(input)

export const parseDecimal = (input: unknown): Result<Decimal, DecimalParseError> =>
  ifElse(
    isFiniteDecimalInput,
    (candidate: number | string): Result<Decimal, DecimalParseError> => success(coerceDecimal(candidate)),
    (candidate: unknown): Result<Decimal, DecimalParseError> =>
      failure({
        kind: 'InvalidDecimalInput',
        input: describeDecimalInput(candidate),
      }),
  )(input)