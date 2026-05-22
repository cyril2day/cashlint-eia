import { anyPass, allPass, cond, ifElse } from '@/shared/fp'
import { failure, mapError, mapResult, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, isStringInput, hasBrand, brand } from '@/shared/domain'
import { getKey } from '@/shared/object'

import {
  formatPADDistrictCode,
  isPADDistrictCode,
  parsePADDistrictCode,
  type PADDistrictCode,
} from './pad-district-code'

const geographyScopeBrand = Symbol('GeographyScope')

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

const hasGeographyScopeBrand = hasBrand(geographyScopeBrand)

const hasUSTotalKind = (candidate: unknown): boolean => getKey('kind')(candidate) === 'USTotal'

const hasCushingKind = (candidate: unknown): boolean => getKey('kind')(candidate) === 'Cushing'

const hasPADDistrictKind = (candidate: unknown): candidate is PADDistrictGeographyScope =>
  getKey('kind')(candidate) === 'PADDistrict'

const isPADDistrictCodeValue = (input: unknown): input is PADDistrictCode => isPADDistrictCode(input)

const hasValidPADDistrictCode = (candidate: unknown): boolean =>
  isPADDistrictCodeValue(getKey('districtCode')(candidate))

const isPADDistrictGeographyScope = allPass([hasPADDistrictKind, hasValidPADDistrictCode])

const isRecognizedGeographyScopeKind = anyPass([hasUSTotalKind, isPADDistrictGeographyScope, hasCushingKind])

const createUSTotalGeographyScope = (): USTotalGeographyScope => ({
  kind: 'USTotal',
  [geographyScopeBrand]: true,
  ...brand(geographyScopeBrand),
})

const createCushingGeographyScope = (): CushingGeographyScope => ({
  kind: 'Cushing',
  [geographyScopeBrand]: true,
  ...brand(geographyScopeBrand),
})

const createPADDistrictGeographyScope = (districtCode: PADDistrictCode): PADDistrictGeographyScope => ({
  kind: 'PADDistrict',
  districtCode,
  [geographyScopeBrand]: true,
  ...brand(geographyScopeBrand),
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

  return mapError(
    mapResult(parsePADDistrictCode(candidateCode), createPADDistrictGeographyScope),
    error => ({
      kind: 'InvalidGeographyScopeInput',
      input: error.input,
    }),
  )
}

const isUSTotal = (value: string): boolean => value === 'USTotal'

const isCushing = (value: string): boolean => value === 'Cushing'

const handleUSTotal = (): Result<GeographyScope, GeographyScopeParseError> =>
  success(createUSTotalGeographyScope())

const handleCushing = (): Result<GeographyScope, GeographyScopeParseError> =>
  success(createCushingGeographyScope())

const makeInvalidGeographyScopeError = (input: unknown): GeographyScopeParseError => ({
  kind: 'InvalidGeographyScopeInput',
  input: String(input),
})

const handleValidGeographyScope = (
  candidate: unknown,
): Result<GeographyScope, GeographyScopeParseError> =>
  ifElse(
    isGeographyScope,
    (c: GeographyScope) => success(c),
    (c: unknown) => failure(makeInvalidGeographyScopeError(c)),
  )(candidate)

const parseGeographyScopeFromString = (
  candidate: unknown,
): Result<GeographyScope, GeographyScopeParseError> => {
  const value = String(candidate)

  return cond([
    [isUSTotal, () => handleUSTotal()],
    [isCushing, () => handleCushing()],
    [() => true, () => parsePADDistrictFromString(value)],
  ])(value)
}

export const isGeographyScope = (input: unknown): input is GeographyScope =>
  ifElse(
    isObjectInput,
    (candidate: object) => allPass([hasGeographyScopeBrand, isRecognizedGeographyScopeKind])(candidate),
    () => false,
  )(input)

export const parseGeographyScope = (
  input: unknown,
): Result<GeographyScope, GeographyScopeParseError> =>
  cond([
    [isGeographyScope, (candidate: unknown) => handleValidGeographyScope(candidate)],
    [isStringInput, (candidate: unknown) => parseGeographyScopeFromString(candidate)],
    [() => true, (candidate: unknown) => failure(makeInvalidGeographyScopeError(candidate))],
  ])(input)

const formatOtherGeographyScope = (candidate: unknown): string => String(getKey('kind')(candidate))

const formatPADDistrictGeographyScope = (candidate: unknown): string => {
  const districtCode = getKey('districtCode')(candidate)

  return ifElse(
    isPADDistrictCode,
    (code: PADDistrictCode) => `PADDistrict(${formatPADDistrictCode(code)})`,
    () => formatOtherGeographyScope(candidate),
  )(districtCode)
}

export const formatGeographyScope = (geographyScope: GeographyScope): string => {
  return cond([
    [hasPADDistrictKind, (candidate: unknown) => formatPADDistrictGeographyScope(candidate)],
    [() => true, (candidate: unknown) => formatOtherGeographyScope(candidate)],
  ])(geographyScope)
}
