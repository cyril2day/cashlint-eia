import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'

const analysisConfidenceBrand = Symbol('AnalysisConfidence')

export type AnalysisConfidenceLabel = 'High' | 'Medium' | 'Low' | 'Unknown'

const analysisConfidences: readonly AnalysisConfidenceLabel[] = ['High', 'Medium', 'Low', 'Unknown']

export type AnalysisConfidence = Readonly<{
  readonly confidence: AnalysisConfidenceLabel
  readonly [analysisConfidenceBrand]: true
}>

export type AnalysisConfidenceParseError = Readonly<{ readonly kind: 'InvalidAnalysisConfidenceInput'; readonly input: string }>

const isObjectInput = (input: unknown): input is object => input instanceof Object
const isStringInput = (input: unknown): input is string => typeof input === 'string'

const hasAnalysisConfidenceBrand = (candidate: object): boolean => Reflect.get(candidate, analysisConfidenceBrand) === true
const isAnalysisConfidenceLabel = (input: unknown): input is AnalysisConfidenceLabel =>
  ifElse(
    isStringInput,
    (s: string) => analysisConfidences.some(p => p === s),
    () => false,
  )(input)

const hasValidConfidence = (candidate: object): boolean => isAnalysisConfidenceLabel(Reflect.get(candidate, 'confidence'))

const createAnalysisConfidence = (confidence: AnalysisConfidenceLabel): AnalysisConfidence => ({
  confidence,
  [analysisConfidenceBrand]: true,
})

export const isAnalysisConfidence = (input: unknown): input is AnalysisConfidence =>
  ifElse(
    isObjectInput,
    allPass([hasAnalysisConfidenceBrand, hasValidConfidence]),
    () => false,
  )(input)

const makeInvalidAnalysisConfidenceError = (input: unknown): AnalysisConfidenceParseError => ({
  kind: 'InvalidAnalysisConfidenceInput',
  input: String(input),
})

const parseAnalysisConfidenceFromString = (value: string): Result<AnalysisConfidence, AnalysisConfidenceParseError> =>
  ifElse(
    isAnalysisConfidenceLabel,
    (v: AnalysisConfidenceLabel) => success(createAnalysisConfidence(v)),
    (v: unknown) => failure(makeInvalidAnalysisConfidenceError(v)),
  )(value)

export const parseAnalysisConfidence = (
  input: unknown,
): Result<AnalysisConfidence, AnalysisConfidenceParseError> =>
  ifElse(
    isAnalysisConfidence,
    (candidate: AnalysisConfidence) => success(candidate),
    (candidate: unknown) => parseAnalysisConfidenceFromString(String(candidate)),
  )(input)

export const formatAnalysisConfidence = (c: AnalysisConfidence): string => c.confidence
