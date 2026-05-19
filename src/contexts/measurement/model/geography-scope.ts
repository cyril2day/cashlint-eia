import { anyPass, allPass, ifElse, cond } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'

const geographyScopeBrand = Symbol('GeographyScope')

type PADDistrictCode = 'PADI' | 'PADII' | 'PADIII' | 'PADIV' | 'PADV'

const padDistrictCodes: readonly PADDistrictCode[] = ['PADI', 'PADII', 'PADIII', 'PADIV', 'PADV']

export type USTotalGeographyScope = Readonly<{
  readonly kind: 'USTotal'
  readonly [geographyScopeBrand]: true
}>

export type PADDistrictGeographyScope = Readonly<{
  readonly kind: 'PADDistrict'
  readonly districtCode: PADDistrictCode
  readonly [geographyScopeBrand]: true
}>

export type CushingGeographyScope = Readonly<{
  readonly kind: 'Cushing'
  readonly [geographyScopeBrand]: true
}>

export type GeographyScope = USTotalGeographyScope | PADDistrictGeographyScope | CushingGeographyScope

export type GeographyScopeParseError = Readonly<{
  readonly kind: 'InvalidGeographyScopeInput'
  readonly input: string
}>

const isObjectInput = (input: unknown): input is object => input instanceof Object

const isStringInput = (input: unknown): input is string => typeof input === 'string'

const hasGeographyScopeBrand = (candidate: object): boolean => Reflect.get(candidate, geographyScopeBrand) === true

const hasUSTotalKind = (candidate: object): boolean => Reflect.get(candidate, 'kind') === 'USTotal'

const hasCushingKind = (candidate: object): boolean => Reflect.get(candidate, 'kind') === 'Cushing'

const hasPADDistrictKind = (candidate: object): boolean => Reflect.get(candidate, 'kind') === 'PADDistrict'

const isPADDistrictCode = (input: unknown): input is PADDistrictCode =>
  ifElse(
    isStringInput,
    (candidate: string): boolean => padDistrictCodes.some(code => code === candidate),
    () => false,
  )(input)

const hasValidPADDistrictCode = (candidate: object): boolean => isPADDistrictCode(Reflect.get(candidate, 'districtCode'))

const isPADDistrictGeographyScope = allPass([hasPADDistrictKind, hasValidPADDistrictCode])

const isRecognizedGeographyScopeKind = anyPass([hasUSTotalKind, isPADDistrictGeographyScope, hasCushingKind])

const createUSTotalGeographyScope = (): USTotalGeographyScope =>
  ({
    kind: 'USTotal',
    [geographyScopeBrand]: true,
  })

const createCushingGeographyScope = (): CushingGeographyScope =>
  ({
    kind: 'Cushing',
    [geographyScopeBrand]: true,
  })

const createPADDistrictGeographyScope = (districtCode: PADDistrictCode): PADDistrictGeographyScope =>
  ({
    kind: 'PADDistrict',
    districtCode,
    [geographyScopeBrand]: true,
  })

const parsePADDistrictFromString = (
  value: string,
): Result<GeographyScope, GeographyScopeParseError> => {
  const wrappedPattern = /^PADDistrict\((PADI|PADII|PADIII|PADIV|PADV)\)$/

  const extractCode = (v: string): string =>
    ifElse(
      (s: string) => wrappedPattern.test(s),
      (s: string) => s.replace(wrappedPattern, '$1'),
      (s: string) => s,
    )(v)

  const candidateCode = extractCode(value)

  return ifElse(
    isPADDistrictCode,
    (code: PADDistrictCode): Result<GeographyScope, GeographyScopeParseError> =>
      success(createPADDistrictGeographyScope(code)),
    (): Result<GeographyScope, GeographyScopeParseError> =>
      failure({
        kind: 'InvalidGeographyScopeInput',
        input: value,
      }),
  )(candidateCode)
}

const isUSTotal = (value: string): boolean => value === 'USTotal'

const isCushing = (value: string): boolean => value === 'Cushing'

const handleUSTotal = (): Result<GeographyScope, GeographyScopeParseError> =>
  success(createUSTotalGeographyScope())

const handleCushing = (): Result<GeographyScope, GeographyScopeParseError> =>
  success(createCushingGeographyScope())

const parseGeographyScopeFromString = (
  candidate: unknown,
): Result<GeographyScope, GeographyScopeParseError> => {
  const value = String(candidate)

  return cond([
    [isUSTotal, handleUSTotal],
    [isCushing, handleCushing],
    [() => true, (_: string) => parsePADDistrictFromString(String(_))],
  ])(value)
}

export const isGeographyScope = (input: unknown): input is GeographyScope =>
  ifElse(
    isObjectInput,
    allPass([hasGeographyScopeBrand, isRecognizedGeographyScopeKind]),
    () => false,
  )(input)

const handleValidGeographyScope = (
  candidate: GeographyScope,
): Result<GeographyScope, GeographyScopeParseError> => success(candidate)

const handleInvalidGeographyScope = (
  candidate: unknown,
): Result<GeographyScope, GeographyScopeParseError> =>
  failure({
    kind: 'InvalidGeographyScopeInput',
    input: String(candidate),
  })

export const parseGeographyScope = (
  input: unknown,
): Result<GeographyScope, GeographyScopeParseError> =>
  cond([
    [
      (v: unknown) => isGeographyScope(v),
      (v: unknown) => ifElse(isGeographyScope, handleValidGeographyScope, handleInvalidGeographyScope)(v),
    ],
    [
      (v: unknown) => isStringInput(v), 
      (v: unknown) => parseGeographyScopeFromString(v)
    ],
    [
      () => true, 
      (v: unknown) => handleInvalidGeographyScope(v)
    ]
  ])(input)

export const formatGeographyScope = (geographyScope: GeographyScope): string =>
  ifElse(
    hasPADDistrictKind,
    (candidate: GeographyScope): string =>
      'PADDistrict(' + String(Reflect.get(candidate, 'districtCode')) + ')',
    (candidate: GeographyScope): string => String(Reflect.get(candidate, 'kind')),
  )(geographyScope)