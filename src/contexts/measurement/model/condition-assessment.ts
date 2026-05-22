import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, isStringInput, hasBrand, brand } from '@/shared/domain'
import { getKey } from '@/shared/object'

const conditionAssessmentBrand = Symbol('ConditionAssessment')

export type ConditionAssessmentLabel = 'Tightening' | 'Loosening' | 'Balanced' | 'Mixed' | 'Unknown'

const conditionAssessments: readonly ConditionAssessmentLabel[] = ['Tightening', 'Loosening', 'Balanced', 'Mixed', 'Unknown']

export type ConditionAssessment = Readonly<{
  readonly assessment: ConditionAssessmentLabel
  readonly [conditionAssessmentBrand]: true
}>

export type ConditionAssessmentParseError = Readonly<{ readonly kind: 'InvalidConditionAssessmentInput'; readonly input: string }>

const hasConditionAssessmentBrand = hasBrand(conditionAssessmentBrand)
const isConditionAssessmentLabel = (input: unknown): input is ConditionAssessmentLabel =>
  ifElse(
    isStringInput,
    (s: string) => conditionAssessments.some(p => p === s),
    () => false,
  )(input)

const hasValidAssessment = (candidate: object): boolean => isConditionAssessmentLabel(getKey('assessment')(candidate))

const createConditionAssessment = (assessment: ConditionAssessmentLabel): ConditionAssessment => ({
  assessment,
  [conditionAssessmentBrand]: true,
  ...brand(conditionAssessmentBrand),
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
