import type { AnalysisConfidenceLabel } from '../model/analysis-confidence'
import type { AnalysisConditionLabel } from '../model/analysis-condition'

export type AnalysisPolicies = Readonly<{
  readonly allowProvisionalConditionLabels: boolean
  readonly provisionalTighteningConditionLabel: AnalysisConditionLabel
  readonly provisionalLooseningConditionLabel: AnalysisConditionLabel
  readonly mixedConditionLabel: AnalysisConditionLabel
  readonly insufficientConditionLabel: AnalysisConditionLabel
  readonly alignedConfidenceLabel: AnalysisConfidenceLabel
  readonly mixedConfidenceLabel: AnalysisConfidenceLabel
  readonly insufficientConfidenceLabel: AnalysisConfidenceLabel
  readonly fullSystemBalanceNotComputedReason: string
  readonly refineryDataNotIncludedReason: string
  readonly supplyDataNotIncludedReason: string
  readonly preferredNarrativePhrases: readonly string[]
  readonly forbiddenNarrativePhrases: readonly string[]
}>

export const createWalkingSkeletonAnalysisPolicies = (): AnalysisPolicies => ({
  allowProvisionalConditionLabels: false,
  provisionalTighteningConditionLabel: 'Tightening',
  provisionalLooseningConditionLabel: 'Loosening',
  mixedConditionLabel: 'Mixed',
  insufficientConditionLabel: 'Unknown',
  alignedConfidenceLabel: 'Medium',
  mixedConfidenceLabel: 'Low',
  insufficientConfidenceLabel: 'Unknown',
  fullSystemBalanceNotComputedReason: 'Full system balance is not computed in this walking skeleton.',
  refineryDataNotIncludedReason: 'Refinery data is not included in this walking skeleton.',
  supplyDataNotIncludedReason: 'Supply data is not included in this walking skeleton.',
  preferredNarrativePhrases: ['suggests', 'indicates', 'supports', 'is consistent with', 'appears to'],
  forbiddenNarrativePhrases: ['proves', 'guarantees', 'will cause', 'must mean', 'certainly'],
})