import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'

const conditionAssessmentBrand = Symbol('ConditionAssessment')

export type ConditionAssessmentLabel = 'Tightening' | 'Loosening' | 'Balanced' | 'Mixed' | 'Unknown'

const conditionAssessments: readonly ConditionAssessmentLabel[] = ['Tightening', 'Loosening', 'Balanced', 'Mixed', 'Unknown']

export type ConditionAssessment = Readonly<{
  readonly assessment: ConditionAssessmentLabel
  readonly [conditionAssessmentBrand]: true
}>

export type ConditionAssessmentParseError = Readonly<{ readonly kind: 'InvalidConditionAssessmentInput'; readonly input: string }>

const isObjectInput = (input: unknown): input is object => input instanceof Object
const isStringInput = (input: unknown): input is string => typeof input === 'string'

const hasConditionAssessmentBrand = (candidate: object): boolean => Reflect.get(candidate, conditionAssessmentBrand) === true
const isConditionAssessmentLabel = (input: unknown): input is ConditionAssessmentLabel =>
  ifElse(
    isStringInput,
    (s: string) => conditionAssessments.some(p => p === s),
    () => false,
  )(input)

const hasValidAssessment = (candidate: object): boolean => isConditionAssessmentLabel(Reflect.get(candidate, 'assessment'))

const createConditionAssessment = (assessment: ConditionAssessmentLabel): ConditionAssessment => ({
  assessment,
  [conditionAssessmentBrand]: true,
})

export const isConditionAssessment = (input: unknown): input is ConditionAssessment =>
  ifElse(
    isObjectInput,
    allPass([hasConditionAssessmentBrand, hasValidAssessment]),
    () => false,
  )(input)

const makeInvalidConditionAssessmentError = (input: unknown): ConditionAssessmentParseError => ({
  kind: 'InvalidConditionAssessmentInput',
  input: String(input),
})

const parseConditionAssessmentFromString = (value: string): Result<ConditionAssessment, ConditionAssessmentParseError> =>
  ifElse(
    isConditionAssessmentLabel,
    (v: ConditionAssessmentLabel) => success(createConditionAssessment(v)),
    (v: unknown) => failure(makeInvalidConditionAssessmentError(v)),
  )(value)

export const parseConditionAssessment = (
  input: unknown,
): Result<ConditionAssessment, ConditionAssessmentParseError> =>
  ifElse(
    isConditionAssessment,
    (candidate: ConditionAssessment) => success(candidate),
    (candidate: unknown) => parseConditionAssessmentFromString(String(candidate)),
  )(input)

export const formatConditionAssessment = (c: ConditionAssessment): string => c.assessment
