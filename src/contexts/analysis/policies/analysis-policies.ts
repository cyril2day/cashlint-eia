import type { SystemBalanceState, BalanceDriverKind } from '@/contexts/system-balance/model'
import type { AnalysisConfidenceLabel } from '@/contexts/analysis/model/analysis-confidence'
import type { AnalysisConditionLabel } from '@/contexts/analysis/model/analysis-condition'

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

export type FullAnalysisPolicies = AnalysisPolicies & Readonly<{
  readonly condition: Readonly<{
    readonly preferredBalanceStates: readonly SystemBalanceState[]
    readonly mixedEvidenceStates: readonly SystemBalanceState[]
  }>
  readonly drivers: Readonly<{
    readonly maximumCount: number
    readonly priorityKinds: readonly BalanceDriverKind[]
  }>
  readonly signals: Readonly<{
    readonly maximumCount: number
  }>
  readonly historicalQualifications: Readonly<{
    readonly maximumCount: number
  }>
  readonly confidence: Readonly<{
    readonly balanceStateConfidence: Readonly<Record<SystemBalanceState, AnalysisConfidenceLabel>>
    readonly contradictorySignalPenalty: number
    readonly partialInterpretationPenalty: number
  }>
}>

export const createCoreWeeklyAnalysisPolicies = (): AnalysisPolicies => ({
  allowProvisionalConditionLabels: false,
  provisionalTighteningConditionLabel: 'Tightening',
  provisionalLooseningConditionLabel: 'Loosening',
  mixedConditionLabel: 'Mixed',
  insufficientConditionLabel: 'Unknown',
  alignedConfidenceLabel: 'Medium',
  mixedConfidenceLabel: 'Low',
  insufficientConfidenceLabel: 'Unknown',
  fullSystemBalanceNotComputedReason: 'Full system balance is not part of this weekly run yet.',
  refineryDataNotIncludedReason: 'Refinery data is not part of this weekly run yet.',
  supplyDataNotIncludedReason: 'Supply data is not part of this weekly run yet.',
  preferredNarrativePhrases: ['suggests', 'indicates', 'supports', 'is consistent with', 'appears to'],
  forbiddenNarrativePhrases: ['proves', 'guarantees', 'will cause', 'must mean', 'certainly'],
})

export const createFullAnalysisPolicies = (): FullAnalysisPolicies => ({
  ...createCoreWeeklyAnalysisPolicies(),
  condition: {
    preferredBalanceStates: ['Tightening', 'Loosening', 'Balanced', 'Mixed', 'Unknown'],
    mixedEvidenceStates: ['Mixed', 'Unknown'],
  },
  drivers: {
    maximumCount: 3,
    priorityKinds: [
      'InventoryDraw',
      'InventoryBuild',
      'StrongerRefineryDemand',
      'WeakerRefineryDemand',
      'DecreasedImports',
      'IncreasedImports',
      'IncreasedExports',
      'DecreasedExports',
      'IncreasedProduction',
      'DecreasedProduction',
      'SupplyPressureMovement',
    ],
  },
  signals: {
    maximumCount: 2,
  },
  historicalQualifications: {
    maximumCount: 2,
  },
  confidence: {
    balanceStateConfidence: {
      Tightening: 'High',
      Loosening: 'High',
      Balanced: 'Medium',
      Mixed: 'Low',
      Unknown: 'Unknown',
    },
    contradictorySignalPenalty: 1,
    partialInterpretationPenalty: 1,
  },
})
