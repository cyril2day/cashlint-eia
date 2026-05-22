import { brand, hasBrand, isObjectInput, isStringInput } from '@/shared/domain'
import { ifElse, allPass } from '@/shared/fp'
import { getKey } from '@/shared/object'

const analysisSignalAlignmentBrand = Symbol('AnalysisSignalAlignment')

export type AnalysisSignalAlignmentLabel = 'AlignedTightening' | 'AlignedLoosening' | 'Mixed' | 'Insufficient'

const analysisSignalAlignments: readonly AnalysisSignalAlignmentLabel[] = ['AlignedTightening', 'AlignedLoosening', 'Mixed', 'Insufficient']

export type AnalysisSignalAlignment = Readonly<{
  readonly alignment: AnalysisSignalAlignmentLabel
  readonly [analysisSignalAlignmentBrand]: true
}>

const hasAnalysisSignalAlignmentBrand = hasBrand(analysisSignalAlignmentBrand)
const isAnalysisSignalAlignmentLabel = (input: unknown): input is AnalysisSignalAlignmentLabel =>
  ifElse(
    isStringInput,
    (s: string) => analysisSignalAlignments.some(p => p === s),
    () => false,
  )(input)

const hasValidAlignment = (candidate: object): boolean => isAnalysisSignalAlignmentLabel(getKey('alignment')(candidate))

export const createAnalysisSignalAlignment = (alignment: AnalysisSignalAlignmentLabel): AnalysisSignalAlignment => ({
  alignment,
  [analysisSignalAlignmentBrand]: true,
  ...brand(analysisSignalAlignmentBrand),
})

export const isAnalysisSignalAlignment = (input: unknown): input is AnalysisSignalAlignment =>
  ifElse(
    isObjectInput,
    (candidate: object) => allPass([hasAnalysisSignalAlignmentBrand, hasValidAlignment])(candidate),
    () => false,
  )(input)

export const formatAnalysisSignalAlignment = (alignment: AnalysisSignalAlignment): string => alignment.alignment