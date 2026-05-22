import { brand, hasBrand, isObjectInput, isStringInput } from '@/shared/domain'
import { ifElse, allPass } from '@/shared/fp'
import { getKey } from '@/shared/object'

const analysisConditionBrand = Symbol('AnalysisCondition')

export type AnalysisConditionLabel = 'Tightening' | 'Loosening' | 'Mixed' | 'Unknown'

const analysisConditions: readonly AnalysisConditionLabel[] = ['Tightening', 'Loosening', 'Mixed', 'Unknown']

export type AnalysisCondition = Readonly<{
  readonly condition: AnalysisConditionLabel
  readonly [analysisConditionBrand]: true
}>

const hasAnalysisConditionBrand = hasBrand(analysisConditionBrand)
const isAnalysisConditionLabel = (input: unknown): input is AnalysisConditionLabel =>
  ifElse(
    isStringInput,
    (s: string) => analysisConditions.some(p => p === s),
    () => false,
  )(input)

const hasValidCondition = (candidate: object): boolean => isAnalysisConditionLabel(getKey('condition')(candidate))

export const createAnalysisCondition = (condition: AnalysisConditionLabel): AnalysisCondition => ({
  condition,
  [analysisConditionBrand]: true,
  ...brand(analysisConditionBrand),
})

export const isAnalysisCondition = (input: unknown): input is AnalysisCondition =>
  ifElse(
    isObjectInput,
    (candidate: object) => allPass([hasAnalysisConditionBrand, hasValidCondition])(candidate),
    () => false,
  )(input)

export const formatAnalysisCondition = (condition: AnalysisCondition): string => condition.condition