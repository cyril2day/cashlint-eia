import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'

const sourceIdentityBrand = Symbol('SourceIdentity')

export type SourceIdentity = Readonly<{
  readonly id: string
  readonly [sourceIdentityBrand]: true
}>

export type SourceIdentityParseError = Readonly<{ readonly kind: 'InvalidSourceIdentityInput'; readonly input: string }>

const isObjectInput = (input: unknown): input is object => input instanceof Object
const isStringInput = (input: unknown): input is string => typeof input === 'string'

const hasSourceIdentityBrand = (candidate: object): boolean => Reflect.get(candidate, sourceIdentityBrand) === true
const isNonEmptyString = (input: unknown): input is string => ifElse(isStringInput, (s: string) => s.trim().length > 0, () => false)(input)

const hasValidId = (candidate: object): boolean => isNonEmptyString(Reflect.get(candidate, 'id'))

const createSourceIdentity = (id: string): SourceIdentity => ({ id, [sourceIdentityBrand]: true })

export const isSourceIdentity = (input: unknown): input is SourceIdentity =>
  ifElse(
    isObjectInput,
    allPass([hasSourceIdentityBrand, hasValidId]),
    () => false,
  )(input)

const makeInvalidSourceIdentityError = (input: unknown): SourceIdentityParseError => ({
  kind: 'InvalidSourceIdentityInput',
  input: String(input),
})

const parseSourceIdentityFromString = (value: string): Result<SourceIdentity, SourceIdentityParseError> =>
  ifElse(
    isNonEmptyString,
    (v: string) => success(createSourceIdentity(v)),
    (v: unknown) => failure(makeInvalidSourceIdentityError(v)),
  )(value)

export const parseSourceIdentity = (
  input: unknown,
): Result<SourceIdentity, SourceIdentityParseError> =>
  ifElse(
    isSourceIdentity,
    (candidate: SourceIdentity) => success(candidate),
    (candidate: unknown) => parseSourceIdentityFromString(String(candidate)),
  )(input)

export const formatSourceIdentity = (s: SourceIdentity): string => s.id
