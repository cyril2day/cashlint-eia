import { brand, hasBrand, isObjectInput, isStringInput } from '@/shared/domain'
import { ifElse, allPass } from '@/shared/fp'
import { getKey } from '@/shared/object'

const analysisConfidenceBrand = Symbol('AnalysisConfidence')

export type AnalysisConfidenceLabel = 'High' | 'Medium' | 'Low' | 'Unknown'

const analysisConfidences: readonly AnalysisConfidenceLabel[] = ['High', 'Medium', 'Low', 'Unknown']

export type AnalysisConfidence = Readonly<{
  readonly confidence: AnalysisConfidenceLabel
  readonly [analysisConfidenceBrand]: true
}>

const hasAnalysisConfidenceBrand = hasBrand(analysisConfidenceBrand)
const isAnalysisConfidenceLabel = (input: unknown): input is AnalysisConfidenceLabel =>
  ifElse(
    isStringInput,
    (s: string) => analysisConfidences.some(p => p === s),
    () => false,
  )(input)

const hasValidConfidence = (candidate: object): boolean => isAnalysisConfidenceLabel(getKey('confidence')(candidate))

export const createAnalysisConfidence = (confidence: AnalysisConfidenceLabel): AnalysisConfidence => ({
  confidence,
  [analysisConfidenceBrand]: true,
  ...brand(analysisConfidenceBrand),
})

export const isAnalysisConfidence = (input: unknown): input is AnalysisConfidence =>
  ifElse(
    isObjectInput,
    (candidate: object) => allPass([hasAnalysisConfidenceBrand, hasValidConfidence])(candidate),
    () => false,
  )(input)

export const formatAnalysisConfidence = (confidence: AnalysisConfidence): string => confidence.confidence