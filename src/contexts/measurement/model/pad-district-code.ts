import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, isStringInput, hasBrand, brand } from '@/shared/domain'
import { getKey } from '@/shared/object'

const padDistrictCodeBrand = Symbol('PADDistrictCode')

export type PADDistrictCodeLabel = 'PADI' | 'PADII' | 'PADIII' | 'PADIV' | 'PADV'

const padDistrictCodes: readonly PADDistrictCodeLabel[] = ['PADI', 'PADII', 'PADIII', 'PADIV', 'PADV']

export type PADDistrictCode = Readonly<{
  readonly code: PADDistrictCodeLabel
  readonly [padDistrictCodeBrand]: true
}>

export type PADDistrictCodeParseError = Readonly<{
  readonly kind: 'InvalidPADDistrictCodeInput'
  readonly input: string
}>

const hasPADDistrictCodeBrand = hasBrand(padDistrictCodeBrand)

const isPADDistrictCodeLabel = (input: unknown): input is PADDistrictCodeLabel =>
  ifElse(
    isStringInput,
    (s: string) => padDistrictCodes.some(code => code === s),
    () => false,
  )(input)

const hasValidCode = (candidate: object): boolean => isPADDistrictCodeLabel(getKey('code')(candidate))

const createPADDistrictCode = (code: PADDistrictCodeLabel): PADDistrictCode => ({
  code,
  [padDistrictCodeBrand]: true,
  ...brand(padDistrictCodeBrand),
})

const parsePADDistrictCodeFromString = (value: string): Result<PADDistrictCode, PADDistrictCodeParseError> => {
  return ifElse(
    isPADDistrictCodeLabel,
    (v: PADDistrictCodeLabel) => success(createPADDistrictCode(v)),
    (v: unknown) => failure(makeInvalidPADDistrictCodeError(v)),
  )(value)
}

const makeInvalidPADDistrictCodeError = (input: unknown): PADDistrictCodeParseError => ({
  kind: 'InvalidPADDistrictCodeInput',
  input: String(input),
})

export const isPADDistrictCode = (input: unknown): input is PADDistrictCode =>
  ifElse(
    isObjectInput,
    allPass([hasPADDistrictCodeBrand, hasValidCode]),
    () => false,
  )(input)

export const parsePADDistrictCode = (
  input: unknown,
): Result<PADDistrictCode, PADDistrictCodeParseError> =>
  ifElse(
    isPADDistrictCode,
    (candidate: PADDistrictCode) => success(candidate),
    (candidate: unknown) => parsePADDistrictCodeFromString(String(candidate)),
  )(input)

export const formatPADDistrictCode = (code: PADDistrictCode): PADDistrictCodeLabel => code.code